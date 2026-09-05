// Capa de persistencia local. IndexedDB sigue siendo la cache/cola offline
// (spec §53): toda lectura/escritura de la UI pasa por acá primero, nunca
// espera a la red. La diferencia frente a la v1: ahora la base es POR
// USUARIO (namespaced por user_id de Supabase Auth) — así, si dos cuentas
// distintas usan el mismo navegador, sus datos no se pisan ni se ven entre
// sí, aunque Supabase esté offline en ese momento. La fuente de verdad
// "real" (multi-dispositivo) pasa a ser Supabase — ver /src/sync/*.
const DB_PREFIX = "impulse_db";
const DB_VERSION = 1;
export const TABLES = [
    "profiles",
    "areas",
    "habits",
    "habit_logs",
    "objectives",
    "objective_items",
    "consumptions",
    "consumption_logs",
    "meal_logs",
    "water_logs",
    "workout_logs",
    "incomes",
    "expenses",
    "budgets",
    "financial_goals",
    "goal_contributions",
    "frequent_actions",
    "reminders",
    "ai_messages",
    "ai_memory",
    "score_snapshots",
    "schedule_events", // Cronograma
    "audit_log", // Legajo
    "sync_outbox",
    "kv", // pares clave/valor: home_layout, nav_layout, config, currency
];
let currentUserId = null;
let dbPromise = null;
/** Se llama al iniciar/cerrar sesión: cierra la conexión anterior (si había)
 * y apunta todas las lecturas/escrituras siguientes a la base del usuario
 * indicado. `null` = sin sesión (no debería usarse para leer/escribir). */
export function setActiveUser(userId) {
    if (userId === currentUserId)
        return;
    if (dbPromise) {
        dbPromise.then((db) => db.close()).catch(() => { });
    }
    currentUserId = userId;
    dbPromise = null;
}
export function getActiveUser() {
    return currentUserId;
}
function dbName() {
    if (!currentUserId)
        throw new Error("setActiveUser() no fue llamado todavía — no hay sesión activa.");
    return `${DB_PREFIX}_${currentUserId}`;
}
function openDb() {
    if (dbPromise)
        return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName(), DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            for (const t of TABLES) {
                if (!db.objectStoreNames.contains(t)) {
                    db.createObjectStore(t, { keyPath: "id" });
                }
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
    return dbPromise;
}
function tx(db, table, mode) {
    return db.transaction(table, mode).objectStore(table);
}
export async function dbGetAll(table) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const req = tx(db, table, "readonly").getAll();
        req.onsuccess = () => resolve(req.result.filter((r) => !r.deleted_at));
        req.onerror = () => reject(req.error);
    });
}
export async function dbGet(table, id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const req = tx(db, table, "readonly").get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}
export async function dbPut(table, row) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const req = tx(db, table, "readwrite").put(row);
        req.onsuccess = () => resolve(row);
        req.onerror = () => reject(req.error);
    });
}
export async function dbDelete(table, id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const req = tx(db, table, "readwrite").delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}
/** Borra POR COMPLETO la base local del usuario activo (todas las object
 * stores). Se usa al cerrar sesión con "borrar datos de este dispositivo" o
 * al eliminar la cuenta — nunca se llama automáticamente en un logout normal
 * (el logout normal solo desconecta, no borra la cache local). */
export async function dropActiveUserDb() {
    if (!currentUserId)
        return;
    const name = dbName();
    if (dbPromise) {
        const db = await dbPromise;
        db.close();
    }
    dbPromise = null;
    await new Promise((resolve) => {
        const req = indexedDB.deleteDatabase(name);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
    });
}
export function uuid() {
    if (crypto.randomUUID)
        return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
export function nowIso() {
    return new Date().toISOString();
}
export function today() {
    return new Date().toISOString().slice(0, 10);
}
/** Encola una operación en sync_outbox. El worker de sync
 * (/src/sync/syncWorker.ts) la sube a Supabase y la marca sincronizada. */
export async function enqueueOutbox(table, op, rowId, payload) {
    if (table === "sync_outbox" || table === "kv")
        return;
    const entry = {
        id: uuid(),
        table,
        op,
        row_id: rowId,
        payload,
        created_at: nowIso(),
        status: "pendiente",
    };
    await dbPut("sync_outbox", entry);
}
export async function kvGet(key, fallback) {
    const row = await dbGet("kv", key);
    return row ? row.value : fallback;
}
export async function kvSet(key, value) {
    await dbPut("kv", { id: key, value });
}
