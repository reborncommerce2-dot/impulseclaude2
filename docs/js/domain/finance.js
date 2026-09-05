import { makeRepo } from "../core/repo.js";
import { bus } from "../core/bus.js";
import { today } from "../core/db.js";
import { getCurrency } from "./system.js";
import { logAudit } from "./audit.js";
export const incomesRepo = makeRepo("incomes");
export const expensesRepo = makeRepo("expenses");
export const budgetsRepo = makeRepo("budgets");
export const goalsRepo = makeRepo("financial_goals");
export const contributionsRepo = makeRepo("goal_contributions");
export async function createIncome(data) {
    const row = await incomesRepo.create({
        amount: data.amount, currency: await getCurrency(), category: data.category ?? "General",
        date: data.date ?? today(), recurring: data.recurring ?? false, note: data.note ?? null,
    });
    bus.emit();
    return row;
}
export async function createExpense(data) {
    const row = await expensesRepo.create({
        amount: data.amount, currency: await getCurrency(), category: data.category ?? "General",
        date: data.date ?? today(), fixed: data.fixed ?? false, recurring: data.recurring ?? false, note: data.note ?? null,
    });
    await logAudit("finanzas", "crear_gasto", null, `${row.category}: ${row.amount}`);
    bus.emit();
    return row;
}
export async function createBudget(data) {
    const row = await budgetsRepo.create({ amount: data.amount, category: data.category ?? null, period: data.period ?? "mensual" });
    bus.emit();
    return row;
}
export async function createFinancialGoal(data) {
    const row = await goalsRepo.create({
        title: data.title, target_amount: data.target_amount, currency: await getCurrency(),
        target_date: data.target_date ?? null, saved_amount: 0,
    });
    await logAudit("finanzas", "crear_objetivo", null, `"${row.title}": ${row.target_amount}`);
    bus.emit();
    return row;
}
export async function contributeToGoal(goal_id, amount) {
    await contributionsRepo.create({ goal_id, amount, date: today() });
    const goal = await goalsRepo.get(goal_id);
    if (goal)
        await goalsRepo.update(goal_id, { saved_amount: goal.saved_amount + amount });
    bus.emit();
}
export async function monthSummary(monthOffset = 0) {
    const now = new Date();
    now.setMonth(now.getMonth() + monthOffset);
    const ym = now.toISOString().slice(0, 7);
    const [incomes, expenses] = await Promise.all([incomesRepo.list(), expensesRepo.list()]);
    const inc = incomes.filter((i) => i.date.startsWith(ym)).reduce((s, i) => s + i.amount, 0);
    const exp = expenses.filter((e) => e.date.startsWith(ym)).reduce((s, e) => s + e.amount, 0);
    const byCategory = {};
    for (const e of expenses.filter((e) => e.date.startsWith(ym))) {
        byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
    }
    return { month: ym, income: inc, expense: exp, balance: inc - exp, byCategory };
}
