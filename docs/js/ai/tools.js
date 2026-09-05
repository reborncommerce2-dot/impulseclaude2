// Registro de herramientas del agente (spec §43). Cada tool es una función
// validada que llama a la MISMA capa de dominio que usa la UI manual — la IA
// nunca toca la base directamente. Esto es lo que en el backend real (ver
// /backend/edge-functions/ai-agent) se expone como "tools" al modelo con
// tool-calling (Anthropic/OpenAI). Acá, en el prototipo sin backend, el
// "cerebro" que decide qué tool llamar es src/ai/nlu.ts en vez de un LLM.
import { areasRepo, habitsRepo, createHabit, logHabit, createObjective, } from "../domain/areas.js";
import { consumptionsRepo, createConsumptionType, logConsumption, logMeal, logWater, logWorkout, } from "../domain/wellbeing.js";
import { createIncome, createExpense, createFinancialGoal } from "../domain/finance.js";
import { createReminder, saveMemory, forgetMemory, toggleHomeModule, ensureProfile, } from "../domain/system.js";
import { queryStats, comparePeriods } from "../domain/stats.js";
import { computeScore, whyScoreChanged } from "../domain/score.js";
async function findAreaByHint(hint) {
    const areas = await areasRepo.list();
    if (!hint)
        return undefined;
    const h = hint.toLowerCase();
    return areas.find((a) => a.name.toLowerCase().includes(h) || h.includes(a.name.toLowerCase()));
}
async function findOrCreateConsumption(name) {
    const all = await consumptionsRepo.list();
    const found = all.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (found)
        return found;
    return createConsumptionType({ name });
}
async function findHabitByName(name) {
    const all = await habitsRepo.list();
    return all.find((h) => h.name.toLowerCase().includes(name.toLowerCase()));
}
export const tools = {
    log_consumption: {
        name: "log_consumption", lowRisk: true,
        async run({ name, quantity }) {
            const c = await findOrCreateConsumption(name);
            await logConsumption({ consumption_id: c.id, quantity, linkExpense: !!c.unit_cost, source: "ia" });
            return { ok: true, message: `Registré ${quantity} ${c.unit === "unidad" ? "" : c.unit} de ${c.name}.` };
        },
    },
    log_expense: {
        name: "log_expense", lowRisk: true,
        async run({ amount, category }) {
            await createExpense({ amount, category: category ?? "General" });
            return { ok: true, message: `Anoté un gasto de $${amount}${category ? ` en ${category}` : ""}.` };
        },
    },
    log_income: {
        name: "log_income", lowRisk: true,
        async run({ amount, category }) {
            await createIncome({ amount, category: category ?? "General" });
            return { ok: true, message: `Anoté un ingreso de $${amount}.` };
        },
    },
    log_water: {
        name: "log_water", lowRisk: true,
        async run({ ml }) {
            await logWater({ ml });
            return { ok: true, message: `Sumé ${ml} ml de agua.` };
        },
    },
    log_meal: {
        name: "log_meal", lowRisk: true,
        async run({ name }) {
            await logMeal({ name });
            return { ok: true, message: `Registré la comida: ${name}.` };
        },
    },
    log_workout: {
        name: "log_workout", lowRisk: true,
        async run({ kind, duration_min }) {
            await logWorkout({ kind, duration_min: duration_min ?? null });
            return { ok: true, message: `Registré ejercicio: ${kind}${duration_min ? ` (${duration_min} min)` : ""}.` };
        },
    },
    log_habit: {
        name: "log_habit", lowRisk: true,
        async run({ name, value }) {
            const h = await findHabitByName(name);
            if (!h)
                return { ok: false, message: `No encontré el hábito "${name}".` };
            await logHabit({ habit_id: h.id, value, source: "ia" });
            return { ok: true, message: `Registré ${value} en ${h.name}.` };
        },
    },
    create_habit: {
        name: "create_habit", lowRisk: false,
        async run({ name, area_hint, polarity }) {
            const area = (await findAreaByHint(area_hint)) ?? (await areasRepo.list())[0];
            await createHabit({ area_id: area.id, name, type: "contador", polarity: polarity ?? "positivo" });
            return { ok: true, message: `Creé el hábito "${name}" en ${area.name}.` };
        },
    },
    create_financial_goal: {
        name: "create_financial_goal", lowRisk: false,
        async run({ title, target_amount, months }) {
            let target_date = null;
            if (months) {
                const d = new Date();
                d.setMonth(d.getMonth() + months);
                target_date = d.toISOString().slice(0, 10);
            }
            const goal = await createFinancialGoal({ title, target_amount, target_date });
            return { ok: true, message: `Creé el objetivo financiero "${title}" por $${target_amount}${months ? ` en ${months} meses` : ""}.`, data: goal };
        },
    },
    create_objective_with_plan: {
        name: "create_objective_with_plan", lowRisk: false,
        async run({ title, months }) {
            let target_date = null;
            if (months) {
                const d = new Date();
                d.setMonth(d.getMonth() + months);
                target_date = d.toISOString().slice(0, 10);
            }
            const obj = await createObjective({ title, target_date });
            return { ok: true, message: `Creé el objetivo "${title}".`, data: obj };
        },
    },
    create_reminder: {
        name: "create_reminder", lowRisk: true,
        async run({ title, datetime }) {
            await createReminder({ title, datetime });
            return { ok: true, message: `Recordatorio creado: "${title}" para ${new Date(datetime).toLocaleString("es-AR")}.` };
        },
    },
    update_home_layout: {
        name: "update_home_layout", lowRisk: false,
        async run({ key, visible }) {
            await toggleHomeModule(key, visible);
            return { ok: true, message: `Actualicé el Home.` };
        },
    },
    remember_fact: {
        name: "remember_fact", lowRisk: true,
        async run({ text }) {
            await saveMemory(text, "usuario");
            return { ok: true, message: `Lo voy a recordar: "${text}".` };
        },
    },
    forget_fact: {
        name: "forget_fact", lowRisk: true,
        async run({ id }) {
            await forgetMemory(id);
            return { ok: true, message: `Listo, lo olvidé.` };
        },
    },
    query_stats: {
        name: "query_stats", lowRisk: true,
        async run({ domain, days }) {
            const data = await queryStats(domain, days ?? 30);
            return { ok: true, message: "", data };
        },
    },
    compare_periods: {
        name: "compare_periods", lowRisk: true,
        async run({ domain, a, b }) {
            const data = await comparePeriods(domain, a, b);
            return { ok: true, message: "", data };
        },
    },
    calculate_score: {
        name: "calculate_score", lowRisk: true,
        async run() {
            const data = await computeScore();
            return { ok: true, message: "", data };
        },
    },
    why_score_changed: {
        name: "why_score_changed", lowRisk: true,
        async run() {
            const message = await whyScoreChanged();
            return { ok: true, message };
        },
    },
};
export async function runTool(name, args) {
    const t = tools[name];
    if (!t)
        return { ok: false, message: `Herramienta desconocida: ${name}` };
    if (!t.lowRisk) {
        const profile = await ensureProfile();
        if (profile.autonomy === "asistente") {
            return { ok: false, message: `PENDIENTE_CONFIRMACION` };
        }
    }
    try {
        return await t.run(args);
    }
    catch (e) {
        return { ok: false, message: `No pude completar la acción: ${e.message ?? e}` };
    }
}
