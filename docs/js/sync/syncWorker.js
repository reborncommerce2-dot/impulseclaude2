// Motor de sync. Reutiliza el patrón outbox que ya existía en el proyecto
// (cada escritura local ya encola una entrada en sync_outbox — ver
// /src/core/repo.ts) y le agrega el lado que faltaba: subir esas entradas a
// Supabase, y bajar los cambios hechos desde otro dispositivo/sesión.
//
// Estrategia deliberadamente simple para el tamaño de esta app (spec §52):
// - Subida: cada entrada pendiente del outbox se sube tal cual (insert/update
//   como upsert por `id`, delete como soft-delete remoto).
// - Bajada: se trae la tabla completa del usuario y se mergea localmente con
//   last-write-wins por `updated_at`, salvo perfil/config que van directo.
// No es un CRDT ni sync incremental por timestamp — para el volumen de datos
// de un usuario individual esto sincroniza en menos de un segundo y es mucho
// más fácil de auditar que algo más sofisticado.
import { getSupabase } from "../core/supabaseClient.js";
import { dbGetAll, dbGet, dbPut, dbDelete, kvGet, kvSet, getActiveUser, } from "../core/db.js";
import { bus } from "../core/bus.js";
// Tablas que se sincronizan como filas 1:1 (mismo `id` local y remoto).
const ROW_TABLES = [
    "areas", "habits", "habit_logs", "objectives", "objective_items",
    "consumptions", "consumption_logs", "meal_logs", "water_logs", "workout_logs",
    "incomes", "expenses", "budgets", "financial_goals", "goal_contributions",
    "frequent_actions", "reminders", "ai_messages", "ai_memory", "score_snapshots",
    "schedule_events", "audit_log",
];
let status = "idle";
let lastError = null;
export function getSyncStatus() { return { status, lastError }; }
function stripLocal(row) {
    const { dirty, ...rest } = row;
    return rest;
}
async function pushOutbox(supabase, userId) {
    const outbox = await dbGetAll("sync_outbox");
    const pending = outbox.filter((o) => o.status === "pendiente");
    let failures = 0;
    for (const entry of pending) {
        try {
            if (entry.table === "profiles") {
                if (entry.op !== "delete") {
                    const row = stripLocal(entry.payload);
                    const { id, ...rest } = row;
                    const { error } = await supabase.from("profiles").upsert({ ...rest, user_id: userId }, { onConflict: "user_id" });
                    if (error)
                        throw error;
                }
            }
            else if (ROW_TABLES.includes(entry.table)) {
                if (entry.op === "delete") {
                    const { error } = await supabase.from(entry.table).delete().eq("id", entry.row_id);
                    if (error)
                        throw error;
                }
                else {
                    const row = stripLocal(entry.payload);
                    const { error } = await supabase.from(entry.table).upsert({ ...row, user_id: userId }, { onConflict: "id" });
                    if (error)
                        throw error;
                }
            }
            await dbDelete("sync_outbox", entry.id);
        }
        catch (err) {
            failures++;
            await dbPut("sync_outbox", { ...entry, status: "error", last_error: String(err?.message ?? err) });
        }
    }
    if (failures)
        throw new Error(`No se pudieron sincronizar ${failures} cambio(s). Revisá la configuración de Supabase.`);
}
async function pushKv(supabase, userId) {
    const home = await kvGet("home_layout", null);
    const nav = await kvGet("nav_layout", null);
    const currency = await kvGet("currency", null);
    if (home) {
        const { error } = await supabase.from("home_layout").upsert({ user_id: userId, layout: home }, { onConflict: "user_id" });
        if (error)
            throw error;
    }
    if (nav) {
        const { error } = await supabase.from("nav_layout").upsert({ user_id: userId, layout: nav }, { onConflict: "user_id" });
        if (error)
            throw error;
    }
    if (currency) {
        const { error } = await supabase.from("profiles").update({ currency }).eq("user_id", userId);
        if (error)
            throw error;
    }
}
async function pullRow(supabase, userId, table) {
    const { data, error } = await supabase.from(table).select("*").eq("user_id", userId);
    if (error || !data)
        return;
    for (const remote of data) {
        const local = await dbGet(table, remote.id);
        if (!local || !local.updated_at || remote.updated_at > local.updated_at) {
            const { user_id, ...rest } = remote;
            await dbPut(table, rest);
        }
    }
}
async function pullProfileAndKv(supabase, userId) {
    const [{ data: profile }, { data: home }, { data: nav }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("home_layout").select("layout").eq("user_id", userId).maybeSingle(),
        supabase.from("nav_layout").select("layout").eq("user_id", userId).maybeSingle(),
    ]);
    if (profile) {
        const localRows = await dbGetAll("profiles");
        const local = localRows[0];
        if (local) {
            await dbPut("profiles", { ...local, ...profile, id: local.id });
        }
        if (profile.currency)
            await kvSet("currency", profile.currency);
    }
    if (home?.layout)
        await kvSet("home_layout", home.layout);
    if (nav?.layout)
        await kvSet("nav_layout", nav.layout);
}
let syncing = false;
/** Corre subida + bajada. Segura de llamar más de una vez en simultáneo
 * (si ya hay una en curso, la llamada nueva no hace nada). */
export async function runSync() {
    const userId = getActiveUser();
    if (!userId)
        return { ok: false, reason: "sin sesión" };
    if (syncing)
        return { ok: false, reason: "ya en curso" };
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
        status = "offline";
        return { ok: false, reason: "sin conexión" };
    }
    syncing = true;
    status = "syncing";
    bus.emit();
    try {
        const supabase = await getSupabase();
        await pushOutbox(supabase, userId);
        await pushKv(supabase, userId);
        for (const t of ROW_TABLES)
            await pullRow(supabase, userId, t);
        await pullProfileAndKv(supabase, userId);
        status = "idle";
        lastError = null;
        bus.emit();
        return { ok: true };
    }
    catch (err) {
        status = err?.message === "SUPABASE_NOT_CONFIGURED" ? "not_configured" : "error";
        lastError = String(err?.message ?? err);
        bus.emit();
        return { ok: false, reason: lastError };
    }
    finally {
        syncing = false;
    }
}
let autoSyncStarted = false;
/** Sincroniza al entrar, cada 60s, y cuando el navegador recupera conexión. */
export function startAutoSync() {
    if (autoSyncStarted)
        return;
    autoSyncStarted = true;
    runSync();
    setInterval(() => runSync(), 60000);
    if (typeof window !== "undefined") {
        window.addEventListener("online", () => runSync());
    }
}
