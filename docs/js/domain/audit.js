import { makeRepo } from "../core/repo.js";
export const auditRepo = makeRepo("audit_log");
/** Registra una modificación importante en el Legajo del usuario. No emite
 * bus.emit() por sí sola (la llama quien hizo el cambio real, que ya emite
 * el suyo) para no duplicar renders. */
export async function logAudit(module, action, oldValue, newValue) {
    await auditRepo.create({ module, action, old_value: oldValue, new_value: newValue });
}
export async function recentAuditLog(limit = 100) {
    const all = await auditRepo.list(); // ya viene ordenado desc por created_at
    return all.slice(0, limit);
}
