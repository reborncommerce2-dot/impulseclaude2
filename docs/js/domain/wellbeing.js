import { makeRepo } from "../core/repo.js";
import { bus } from "../core/bus.js";
import { today, nowIso } from "../core/db.js";
import { createExpense } from "./finance.js";
export const consumptionsRepo = makeRepo("consumptions");
export const consumptionLogsRepo = makeRepo("consumption_logs");
export const mealLogsRepo = makeRepo("meal_logs");
export const waterLogsRepo = makeRepo("water_logs");
export const workoutLogsRepo = makeRepo("workout_logs");
export const DEFAULT_CONSUMPTIONS = ["Cigarrillos", "Alcohol"];
export async function ensureDefaultConsumptions() {
    const existing = await consumptionsRepo.list();
    if (existing.length > 0)
        return;
    for (const name of DEFAULT_CONSUMPTIONS) {
        await consumptionsRepo.create({ name, unit: "unidad", limit_target: null, unit_cost: null, active: true });
    }
    bus.emit();
}
export async function createConsumptionType(data) {
    const row = await consumptionsRepo.create({
        name: data.name, unit: data.unit ?? "unidad", unit_cost: data.unit_cost ?? null,
        limit_target: data.limit_target ?? null, active: true,
    });
    bus.emit();
    return row;
}
/** Registra consumo. Si el tipo tiene costo unitario, opcionalmente vincula
 * (y crea) el gasto correspondiente para no duplicar el registro (spec: la
 * tabla `consumptions` referencia `expenses` vía `linked_expense_id`). */
export async function logConsumption(data) {
    let linked_expense_id = null;
    if (data.linkExpense) {
        const c = await consumptionsRepo.get(data.consumption_id);
        if (c?.unit_cost) {
            const expense = await createExpense({
                amount: c.unit_cost * data.quantity,
                category: c.name,
                date: data.date ?? today(),
                note: `${data.quantity} ${c.unit} de ${c.name}`,
            });
            linked_expense_id = expense.id;
        }
    }
    const row = await consumptionLogsRepo.create({
        consumption_id: data.consumption_id,
        date: data.date ?? today(),
        time: nowIso().slice(11, 16),
        quantity: data.quantity,
        linked_expense_id,
        source: data.source ?? "manual",
    });
    bus.emit();
    return row;
}
export async function logMeal(data) {
    const row = await mealLogsRepo.create({
        name: data.name, date: data.date ?? today(), time: nowIso().slice(11, 16), note: data.note ?? null,
    });
    bus.emit();
    return row;
}
export async function logWater(data) {
    const row = await waterLogsRepo.create({ ml: data.ml, date: data.date ?? today(), time: nowIso().slice(11, 16) });
    bus.emit();
    return row;
}
export async function logWorkout(data) {
    const row = await workoutLogsRepo.create({
        kind: data.kind, duration_min: data.duration_min ?? null, intensity: data.intensity ?? null,
        date: data.date ?? today(), time: nowIso().slice(11, 16), note: data.note ?? null,
    });
    bus.emit();
    return row;
}
export async function todayTotals() {
    const d = today();
    const [water, workouts, meals, consumptions] = await Promise.all([
        waterLogsRepo.list(), workoutLogsRepo.list(), mealLogsRepo.list(), consumptionLogsRepo.list(),
    ]);
    return {
        water_ml: water.filter((w) => w.date === d).reduce((s, w) => s + w.ml, 0),
        workouts: workouts.filter((w) => w.date === d).length,
        meals: meals.filter((m) => m.date === d).length,
        consumptions: consumptions.filter((c) => c.date === d).reduce((s, c) => s + c.quantity, 0),
    };
}
