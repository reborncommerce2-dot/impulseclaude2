import { makeRepo } from "../core/repo.js";
import { bus } from "../core/bus.js";
import { kvGet, kvSet } from "../core/db.js";
import { logAudit } from "./audit.js";
export const remindersRepo = makeRepo("reminders");
export const frequentActionsRepo = makeRepo("frequent_actions");
export const memoryRepo = makeRepo("ai_memory");
export const messagesRepo = makeRepo("ai_messages");
export const profilesRepo = makeRepo("profiles");
export const DEFAULT_HOME = [
    { key: "score", visible: true, order: 0 },
    { key: "today", visible: true, order: 1 },
    { key: "objectives", visible: true, order: 2 },
    { key: "quick_actions", visible: true, order: 3 },
    { key: "for_you", visible: true, order: 4 },
];
export const DEFAULT_NAV = [
    { key: "home", visible: true, order: 0 },
    { key: "objectives", visible: true, order: 1 },
    { key: "habits", visible: true, order: 2 },
    { key: "consumptions", visible: true, order: 3 },
    { key: "progress", visible: true, order: 4 },
];
export const ALL_MENU_ITEMS = [
    { key: "finance", label: "Finanzas" },
    { key: "food", label: "Alimentación" },
    { key: "water", label: "Agua" },
    { key: "exercise", label: "Ejercicio" },
    { key: "reminders", label: "Recordatorios" },
    { key: "account", label: "Cuenta" },
    { key: "memory", label: "Memoria IA" },
];
// Moneda por defecto: pesos argentinos (la app se pensó para uso en
// Argentina). Se puede cambiar desde Cuenta > Moneda.
export async function getCurrency() {
    return kvGet("currency", "ARS");
}
export async function setCurrency(code) {
    const prev = await getCurrency();
    await kvSet("currency", code);
    await logAudit("cuenta", "cambiar_moneda", prev, code);
    bus.emit();
}
export async function getHomeLayout() {
    return kvGet("home_layout", DEFAULT_HOME);
}
export async function setHomeLayout(layout) {
    await kvSet("home_layout", layout);
    bus.emit();
}
export async function toggleHomeModule(key, visible) {
    const layout = await getHomeLayout();
    const next = layout.map((m) => (m.key === key ? { ...m, visible } : m));
    await setHomeLayout(next);
}
export async function getNavLayout() {
    return kvGet("nav_layout", DEFAULT_NAV);
}
export async function setNavLayout(layout) {
    await kvSet("nav_layout", layout);
    bus.emit();
}
export async function ensureProfile(seed) {
    const rows = await profilesRepo.list();
    if (rows[0])
        return rows[0];
    return profilesRepo.create({
        name: seed?.name ?? "Vos",
        email: seed?.email ?? null,
        autonomy: "copiloto",
        permissions: {
            auto_log: true, create_objectives: true, create_reminders: true,
            edit_home: true, edit_nav: true, destructive_actions: false,
        },
        plan: "free",
        // Spec §34 + pedido explícito del usuario: en etapa de pruebas Premium
        // queda desbloqueado, pero el modelo queda listo para el paywall real.
        premium_unlocked_for_testing: true,
    });
}
export async function setAutonomy(level) {
    const p = await ensureProfile();
    await profilesRepo.update(p.id, { autonomy: level });
    await logAudit("cuenta", "cambiar_autonomia_ia", p.autonomy, level);
    bus.emit();
}
export async function setPermission(key, value) {
    const p = await ensureProfile();
    await profilesRepo.update(p.id, { permissions: { ...p.permissions, [key]: value } });
    await logAudit("cuenta", "cambiar_permiso_ia", `${key}=${p.permissions[key]}`, `${key}=${value}`);
    bus.emit();
}
export async function createReminder(data) {
    const row = await remindersRepo.create({
        title: data.title, datetime: data.datetime, type: data.type ?? "manual",
        repeat: data.repeat ?? "ninguna", condition: data.condition ?? null,
        status: "pendiente", linked_habit_id: data.linked_habit_id ?? null,
    });
    scheduleLocalNotification(row);
    bus.emit();
    return row;
}
/** Notificación local del navegador (spec §54 pide push real vía FCM/APNs
 * cuando haya backend; esto cubre el caso "app abierta / instalada como PWA"
 * hoy mismo, sin depender de servidor). */
function scheduleLocalNotification(r) {
    const ms = new Date(r.datetime).getTime() - Date.now();
    if (ms <= 0 || ms > 1000 * 60 * 60 * 24 * 2)
        return; // no programar más de 48h a futuro en memoria del tab
    if (typeof Notification === "undefined")
        return;
    setTimeout(() => {
        if (Notification.permission === "granted") {
            new Notification("Impulse", { body: r.title });
        }
    }, ms);
}
export async function recordFrequentAction(data) {
    const all = await frequentActionsRepo.list();
    const existing = all.find((f) => f.domain === data.domain && f.label === data.label);
    if (existing) {
        await frequentActionsRepo.update(existing.id, { use_count: existing.use_count + 1, payload: data.payload });
    }
    else {
        await frequentActionsRepo.create({ ...data, use_count: 1 });
    }
    bus.emit();
}
export async function saveMemory(text, origin = "usuario") {
    const row = await memoryRepo.create({ text, origin });
    bus.emit();
    return row;
}
export async function forgetMemory(id) {
    await memoryRepo.remove(id);
    bus.emit();
}
