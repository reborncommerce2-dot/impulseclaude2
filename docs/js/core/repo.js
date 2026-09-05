import { dbDelete, dbGet, dbGetAll, dbPut, enqueueOutbox, nowIso, uuid } from "./db.js";
/** Repositorio genérico: cada función de dominio (src/domain/*.ts) se apoya
 * acá. Este es el ÚNICO camino de escritura de datos de usuario, tanto desde
 * la UI como desde las tools de la IA (spec §13: "nunca ejecuta SQL, las
 * tools son las mismas funciones de dominio validadas que usa la UI"). */
export function makeRepo(table) {
    return {
        table,
        async list() {
            const rows = await dbGetAll(table);
            return rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
        },
        async get(id) {
            return dbGet(table, id);
        },
        async create(data) {
            const row = {
                ...data,
                id: uuid(),
                created_at: nowIso(),
                updated_at: nowIso(),
                deleted_at: null,
                dirty: true,
            };
            await dbPut(table, row);
            await enqueueOutbox(table, "insert", row.id, row);
            return row;
        },
        async update(id, patch) {
            const existing = await dbGet(table, id);
            if (!existing)
                throw new Error(`No existe ${table}/${id}`);
            const row = { ...existing, ...patch, updated_at: nowIso(), dirty: true };
            await dbPut(table, row);
            await enqueueOutbox(table, "update", id, row);
            return row;
        },
        /** Soft delete: nunca se borra localmente por fallo de sync (spec §26). */
        async remove(id) {
            const existing = await dbGet(table, id);
            if (!existing)
                return;
            const row = { ...existing, deleted_at: nowIso(), updated_at: nowIso(), dirty: true };
            await dbPut(table, row);
            await enqueueOutbox(table, "delete", id, { id });
        },
        async hardRemove(id) {
            await dbDelete(table, id);
        },
    };
}
