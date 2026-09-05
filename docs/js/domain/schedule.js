import { makeRepo } from "../core/repo.js";
import { bus } from "../core/bus.js";
import { today } from "../core/db.js";
import { logAudit } from "./audit.js";
export const scheduleRepo = makeRepo("schedule_events");
const WEEKDAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export { WEEKDAY_LABELS };
export async function createScheduleEvent(data) {
    const row = await scheduleRepo.create({
        title: data.title, start_time: data.start_time, end_time: data.end_time,
        date: data.recurrence === "semanal" ? null : (data.date ?? today()),
        recurrence: data.recurrence ?? "ninguna",
        weekdays: data.recurrence === "semanal" ? (data.weekdays ?? []) : [],
        note: data.note ?? null,
    });
    await logAudit("cronograma", "crear", null, `"${row.title}" ${row.start_time}-${row.end_time}`);
    bus.emit();
    return row;
}
export async function updateScheduleEvent(id, patch) {
    const before = await scheduleRepo.get(id);
    const row = await scheduleRepo.update(id, patch);
    await logAudit("cronograma", "editar", before ? `"${before.title}" ${before.start_time}-${before.end_time}` : null, `"${row.title}" ${row.start_time}-${row.end_time}`);
    bus.emit();
    return row;
}
export async function deleteScheduleEvent(id) {
    const before = await scheduleRepo.get(id);
    await scheduleRepo.remove(id);
    await logAudit("cronograma", "borrar", before ? `"${before.title}"` : null, null);
    bus.emit();
}
/** Devuelve los eventos que corresponden a una fecha puntual, incluyendo los
 * recurrentes semanales cuyo día de semana coincide. */
export async function eventsForDate(date) {
    const all = await scheduleRepo.list();
    const weekday = new Date(date + "T00:00:00").getDay();
    return all
        .filter((e) => (e.recurrence === "semanal" ? e.weekdays.includes(weekday) : e.date === date))
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
}
/** Agrupa por día para la vista semanal, empezando el lunes de la semana que
 * contiene `anchorDate`. */
export async function weekView(anchorDate) {
    const anchor = new Date(anchorDate + "T00:00:00");
    const day = anchor.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(anchor);
    monday.setDate(monday.getDate() + mondayOffset);
    const days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().slice(0, 10);
        days.push({ date: dateStr, weekday: d.getDay(), events: await eventsForDate(dateStr) });
    }
    return days;
}
