// Motor de Score. Spec §6: explicable, resistente a un mal día aislado,
// prioriza tendencia/consistencia de los últimos N días por sobre el valor
// puntual de hoy. Hábitos positivos suman, negativos (vicios) restan.
import { objectivesRepo } from "./areas.js";
import { consumptionsRepo, consumptionLogsRepo } from "./wellbeing.js";
import { expensesRepo, incomesRepo, budgetsRepo } from "./finance.js";
const WINDOW_DAYS = 14;
function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
}
function clamp(n, lo = 0, hi = 100) {
    return Math.max(lo, Math.min(hi, n));
}
export async function computeScore() {
    const cutoff = daysAgo(WINDOW_DAYS);
    const breakdown = [];
    // Ejercicio: consistencia de días con actividad en la ventana.
    const { workoutLogsRepo } = await import("./wellbeing.js");
    const workouts = (await workoutLogsRepo.list()).filter((w) => w.date >= cutoff);
    const activeDays = new Set(workouts.map((w) => w.date)).size;
    const exerciseScore = clamp(Math.round((activeDays / WINDOW_DAYS) * 100 * 1.6)); // ~5 días/2sem = 100
    breakdown.push({
        area: "Ejercicio", score: exerciseScore,
        reason: `${activeDays} día(s) con actividad en los últimos ${WINDOW_DAYS} días`,
    });
    // Alimentación / agua: promedio simple de registro de comidas + agua vs objetivo liviano.
    const { mealLogsRepo, waterLogsRepo } = await import("./wellbeing.js");
    const meals = (await mealLogsRepo.list()).filter((m) => m.date >= cutoff);
    const water = (await waterLogsRepo.list()).filter((w) => w.date >= cutoff);
    const mealDays = new Set(meals.map((m) => m.date)).size;
    const waterDays = new Set(water.map((w) => w.date)).size;
    const foodScore = clamp(Math.round(((mealDays + waterDays) / (WINDOW_DAYS * 2)) * 100));
    breakdown.push({
        area: "Alimentación", score: foodScore,
        reason: `Registro en ${mealDays} día(s) de comidas y ${waterDays} de agua`,
    });
    // Finanzas: balance del mes + respeto de presupuesto.
    const now = new Date().toISOString().slice(0, 7);
    const incomes = (await incomesRepo.list()).filter((i) => i.date.startsWith(now));
    const expenses = (await expensesRepo.list()).filter((e) => e.date.startsWith(now));
    const budgets = await budgetsRepo.list();
    const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
    const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
    const generalBudget = budgets.find((b) => b.category === null)?.amount;
    let financeScore = 60;
    let financeReason = "Sin datos suficientes del mes";
    if (totalIncome > 0 || totalExpense > 0) {
        const savingsRate = totalIncome > 0 ? (totalIncome - totalExpense) / totalIncome : -0.5;
        financeScore = clamp(Math.round(50 + savingsRate * 100));
        financeReason = `Balance del mes: ${(totalIncome - totalExpense).toFixed(0)} (ingresos ${totalIncome.toFixed(0)}, gastos ${totalExpense.toFixed(0)})`;
        if (generalBudget) {
            const overBudget = totalExpense > generalBudget;
            financeScore = clamp(overBudget ? financeScore - 20 : financeScore + 10);
            financeReason += overBudget ? " — superó el presupuesto" : " — dentro del presupuesto";
        }
    }
    breakdown.push({ area: "Finanzas", score: financeScore, reason: financeReason });
    // Vicios: menos consumo reciente respecto a la ventana anterior = mejor score.
    const cLogs = await consumptionLogsRepo.list();
    const recent = cLogs.filter((c) => c.date >= cutoff).reduce((s, c) => s + c.quantity, 0);
    const prevCutoff = daysAgo(WINDOW_DAYS * 2);
    const previous = cLogs.filter((c) => c.date >= prevCutoff && c.date < cutoff).reduce((s, c) => s + c.quantity, 0);
    let viceScore = 75;
    let viceReason = "Sin registros de consumo recientes";
    const consumptions = await consumptionsRepo.list();
    if (consumptions.length > 0 && (recent > 0 || previous > 0)) {
        if (previous === 0) {
            viceScore = recent === 0 ? 90 : 55;
        }
        else {
            const change = (recent - previous) / previous;
            viceScore = clamp(Math.round(70 - change * 60));
        }
        viceReason = `${recent} registro(s) en los últimos ${WINDOW_DAYS} días vs. ${previous} en los ${WINDOW_DAYS} anteriores`;
    }
    breakdown.push({ area: "Vicios", score: viceScore, reason: viceReason });
    // Objetivos personales: progreso promedio de objetivos activos.
    const objectives = (await objectivesRepo.list()).filter((o) => o.status !== "abandonado");
    const objScore = objectives.length === 0 ? 50 : clamp(Math.round(objectives.reduce((s, o) => s + o.progress, 0) / objectives.length));
    breakdown.push({
        area: "Objetivos personales", score: objScore,
        reason: objectives.length === 0 ? "No hay objetivos activos todavía" : `Progreso promedio de ${objectives.length} objetivo(s) activo(s)`,
    });
    const global = clamp(Math.round(breakdown.reduce((s, b) => s + b.score, 0) / breakdown.length));
    return { global, breakdown };
}
export async function whyScoreChanged() {
    const { breakdown } = await computeScore();
    const sorted = [...breakdown].sort((a, b) => a.score - b.score);
    const lowest = sorted[0];
    const highest = sorted[sorted.length - 1];
    return `Lo que más está pesando ahora: ${lowest.area} (${lowest.score}) — ${lowest.reason}. Lo que mejor viene: ${highest.area} (${highest.score}) — ${highest.reason}.`;
}
