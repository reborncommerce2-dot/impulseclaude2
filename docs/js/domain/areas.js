import { makeRepo } from "../core/repo.js";
import { bus } from "../core/bus.js";
import { uuid, nowIso, today } from "../core/db.js";
import { logAudit } from "./audit.js";
export const areasRepo = makeRepo("areas");
export const habitsRepo = makeRepo("habits");
export const habitLogsRepo = makeRepo("habit_logs");
export const objectivesRepo = makeRepo("objectives");
export const objectiveItemsRepo = makeRepo("objective_items");
export const DEFAULT_AREAS = [
    { name: "Ejercicio", icon: "activity", color: "#FF5A36", kind: "ejercicio" },
    { name: "Alimentación", icon: "meal", color: "#3DDC97", kind: "alimentacion" },
    { name: "Finanzas", icon: "coin", color: "#4C8DFF", kind: "finanzas" },
    { name: "Vicios", icon: "flame", color: "#B14CFF", kind: "vicios" },
    { name: "Objetivos", icon: "target", color: "#FFC13D", kind: "objetivos" },
];
export async function ensureDefaultAreas() {
    const existing = await areasRepo.list();
    if (existing.length > 0)
        return;
    let order = 0;
    for (const a of DEFAULT_AREAS) {
        await areasRepo.create({ ...a, active: true, order: order++, is_custom: false });
    }
    bus.emit();
}
export async function createArea(data) {
    const areas = await areasRepo.list();
    const row = await areasRepo.create({
        name: data.name,
        icon: data.icon,
        color: data.color,
        kind: "custom",
        active: true,
        order: areas.length,
        is_custom: true,
    });
    bus.emit();
    return row;
}
export async function createHabit(data) {
    const row = await habitsRepo.create({
        area_id: data.area_id,
        name: data.name,
        type: data.type,
        polarity: data.polarity,
        unit: data.unit ?? null,
        target: data.target ?? null,
        frequency: data.frequency ?? "diaria",
        active: true,
    });
    await logAudit("habitos", "crear", null, `"${row.name}"`);
    bus.emit();
    return row;
}
export async function logHabit(data) {
    const row = await habitLogsRepo.create({
        habit_id: data.habit_id,
        date: data.date ?? today(),
        time: nowIso().slice(11, 16),
        value: data.value,
        note: data.note ?? null,
        source: data.source ?? "manual",
    });
    bus.emit();
    return row;
}
export async function habitHistory(habit_id, days = 90) {
    const all = await habitLogsRepo.list();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return all.filter((l) => l.habit_id === habit_id && new Date(l.date) >= cutoff);
}
export async function createObjective(data) {
    const row = await objectivesRepo.create({
        title: data.title,
        area_id: data.area_id ?? null,
        target_date: data.target_date ?? null,
        status: "activo",
        progress: 0,
    });
    await logAudit("objetivos", "crear", null, `"${row.title}"`);
    bus.emit();
    return row;
}
export async function addObjectiveItem(data) {
    const siblings = (await objectiveItemsRepo.list()).filter((i) => i.objective_id === data.objective_id);
    const row = await objectiveItemsRepo.create({
        objective_id: data.objective_id,
        parent_id: data.parent_id ?? null,
        type: data.type,
        title: data.title,
        status: "pendiente",
        order: siblings.length,
    });
    await recomputeObjectiveProgress(data.objective_id);
    bus.emit();
    return row;
}
export async function completeObjectiveItem(item_id, done = true) {
    const item = await objectiveItemsRepo.get(item_id);
    if (!item)
        return;
    await objectiveItemsRepo.update(item_id, { status: done ? "completado" : "pendiente" });
    await logAudit("objetivos", done ? "completar" : "reabrir", null, `"${item.title}"`);
    await recomputeObjectiveProgress(item.objective_id);
    bus.emit();
}
async function recomputeObjectiveProgress(objective_id) {
    const items = (await objectiveItemsRepo.list()).filter((i) => i.objective_id === objective_id);
    const progress = items.length === 0 ? 0 : Math.round((items.filter((i) => i.status === "completado").length / items.length) * 100);
    await objectivesRepo.update(objective_id, { progress, status: progress === 100 ? "completado" : "activo" });
}
export function newId() {
    return uuid();
}
