import { habitLogsRepo, habitsRepo } from "./areas.js";
import { consumptionLogsRepo, consumptionsRepo } from "./wellbeing.js";
import { expensesRepo, incomesRepo } from "./finance.js";
function inRange(date, from, to) {
    return date >= from && date <= to;
}
function monthRange(offset) {
    const d = new Date();
    d.setMonth(d.getMonth() + offset, 1);
    const from = d.toISOString().slice(0, 10);
    const to = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
    return { from, to, label: d.toLocaleDateString("es-AR", { month: "long", year: "numeric" }) };
}
/** query_stats: la IA nunca inventa números — siempre cita lo que esta
 * función devolvió (spec §43, principio "no inventar datos"). */
export async function queryStats(domain, days = 30) {
    const from = new Date();
    from.setDate(from.getDate() - days);
    const fromStr = from.toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    if (domain === "vicios") {
        const logs = (await consumptionLogsRepo.list()).filter((l) => inRange(l.date, fromStr, today));
        const types = await consumptionsRepo.list();
        const byType = {};
        for (const l of logs) {
            const t = types.find((t) => t.id === l.consumption_id)?.name ?? "otro";
            byType[t] = (byType[t] ?? 0) + l.quantity;
        }
        return { domain, days, total: logs.reduce((s, l) => s + l.quantity, 0), byType };
    }
    if (domain === "finanzas") {
        const expenses = (await expensesRepo.list()).filter((e) => inRange(e.date, fromStr, today));
        const incomes = (await incomesRepo.list()).filter((i) => inRange(i.date, fromStr, today));
        const byCategory = {};
        for (const e of expenses)
            byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
        return {
            domain, days,
            totalExpense: expenses.reduce((s, e) => s + e.amount, 0),
            totalIncome: incomes.reduce((s, i) => s + i.amount, 0),
            byCategory,
        };
    }
    if (domain === "ejercicio" || domain === "habitos") {
        const habits = await habitsRepo.list();
        const logs = (await habitLogsRepo.list()).filter((l) => inRange(l.date, fromStr, today));
        const byHabit = {};
        for (const l of logs) {
            const h = habits.find((h) => h.id === l.habit_id)?.name ?? "hábito";
            byHabit[h] = (byHabit[h] ?? 0) + l.value;
        }
        return { domain, days, registros: logs.length, byHabit };
    }
}
/** compare_periods: compara dos meses (ej. agosto vs julio). */
export async function comparePeriods(domain, monthOffsetA, monthOffsetB) {
    const a = monthRange(monthOffsetA);
    const b = monthRange(monthOffsetB);
    if (domain === "finanzas") {
        const expenses = await expensesRepo.list();
        const totalA = expenses.filter((e) => inRange(e.date, a.from, a.to)).reduce((s, e) => s + e.amount, 0);
        const totalB = expenses.filter((e) => inRange(e.date, b.from, b.to)).reduce((s, e) => s + e.amount, 0);
        const pctChange = totalB === 0 ? null : Math.round(((totalA - totalB) / totalB) * 100);
        return { domain, periodA: a.label, periodB: b.label, totalA, totalB, pctChange };
    }
    const logs = await consumptionLogsRepo.list();
    const totalA = logs.filter((l) => inRange(l.date, a.from, a.to)).reduce((s, l) => s + l.quantity, 0);
    const totalB = logs.filter((l) => inRange(l.date, b.from, b.to)).reduce((s, l) => s + l.quantity, 0);
    const pctChange = totalB === 0 ? null : Math.round(((totalA - totalB) / totalB) * 100);
    return { domain, periodA: a.label, periodB: b.label, totalA, totalB, pctChange };
}
export async function getRecords() {
    const expenses = await expensesRepo.list();
    const byDay = {};
    for (const e of expenses)
        byDay[e.date] = (byDay[e.date] ?? 0) + e.amount;
    const worstSpendDay = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
    return { worstSpendDay: worstSpendDay ? { date: worstSpendDay[0], amount: worstSpendDay[1] } : null };
}
