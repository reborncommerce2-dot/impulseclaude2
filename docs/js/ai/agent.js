import { parseMessage } from "./nlu.js";
import { runTool } from "./tools.js";
import { messagesRepo } from "../domain/system.js";
import { ensureProfile } from "../domain/system.js";
import { queryStats, comparePeriods, getRecords } from "../domain/stats.js";
import { whyScoreChanged, computeScore } from "../domain/score.js";
import { bus } from "../core/bus.js";
async function answerQuestion(text) {
    const t = text.toLowerCase();
    if (/por qu[eé].*(baj|subi|cambi).*score/.test(t))
        return whyScoreChanged();
    if (/c[oó]mo.*score|score.*c[oó]mo/.test(t)) {
        const s = await computeScore();
        return `Tu Score global es ${s.global}. ` + s.breakdown.map((b) => `${b.area}: ${b.score}`).join(" · ");
    }
    if (/gastando m[aá]s en vicios|vicios.*este mes|este mes.*vicios/.test(t)) {
        const cmp = await comparePeriods("vicios", 0, -1);
        if (cmp.pctChange === null)
            return `Este mes registraste ${cmp.totalA} consumo(s). No tengo el mes anterior para comparar todavía.`;
        return `${cmp.periodA}: ${cmp.totalA} vs. ${cmp.periodB}: ${cmp.totalB} (${cmp.pctChange > 0 ? "+" : ""}${cmp.pctChange}%).`;
    }
    if (/comparame|compara.*agosto.*julio|compar.*mes/.test(t)) {
        const cmp = await comparePeriods("finanzas", 0, -1);
        if (cmp.pctChange === null)
            return `Este mes gastaste $${cmp.totalA}. No tengo el mes anterior para comparar todavía.`;
        return `Gastos — ${cmp.periodA}: $${cmp.totalA} vs. ${cmp.periodB}: $${cmp.totalB} (${cmp.pctChange > 0 ? "+" : ""}${cmp.pctChange}%).`;
    }
    if (/c[oó]mo estuve|c[oó]mo vengo|resumen de la semana/.test(t)) {
        const stats = await queryStats("habitos", 7);
        const s = await computeScore();
        return `En los últimos 7 días tuviste ${stats?.registros ?? 0} registro(s) de hábitos. Tu Score global hoy es ${s.global}.`;
    }
    if (/mejor mes/.test(t)) {
        const r = await getRecords();
        return r.worstSpendDay ? `Tu día de mayor gasto fue ${r.worstSpendDay.date} con $${r.worstSpendDay.amount}.` : "Todavía no tengo suficiente historial para eso.";
    }
    return null;
}
export async function sendMessage(text) {
    await messagesRepo.create({ role: "user", text, tool_calls: null });
    const question = await answerQuestion(text);
    if (question) {
        await messagesRepo.create({ role: "assistant", text: question, tool_calls: null });
        bus.emit();
        return { reply: question };
    }
    const parsed = parseMessage(text);
    if (parsed.length === 0) {
        const reply = "No estoy seguro de qué acción es esa. Podés decirme cosas como \"fumé 2 cigarrillos\", \"gasté 8 dólares en comida\", \"recordame mañana a las 9 ir al gimnasio\" o preguntarme por tus estadísticas.";
        await messagesRepo.create({ role: "assistant", text: reply, tool_calls: null });
        bus.emit();
        return { reply };
    }
    const profile = await ensureProfile();
    const results = [];
    const pending = [];
    const doneMsgs = [];
    for (const call of parsed) {
        const isLowRiskCall = call.tool !== "create_financial_goal" && call.tool !== "create_habit" && call.tool !== "update_home_layout";
        const needsConfirm = profile.autonomy === "asistente" && !isLowRiskCall;
        if (needsConfirm) {
            pending.push(call);
            continue;
        }
        const res = await runTool(call.tool, call.args);
        results.push({ tool: call.tool, args: call.args, result: res.message });
        if (res.ok)
            doneMsgs.push(res.message);
    }
    let reply = doneMsgs.join(" ");
    if (pending.length > 0) {
        reply += (reply ? " " : "") + `Además, ¿confirmás estas acciones?: ${pending.map((p) => p.label).join("; ")}.`;
    }
    if (!reply)
        reply = "No pude ejecutar esa acción.";
    await messagesRepo.create({ role: "assistant", text: reply, tool_calls: results.length ? results : null });
    bus.emit();
    return { reply, pending: pending.length ? pending : undefined };
}
export async function confirmPending(call) {
    const res = await runTool(call.tool, call.args);
    await messagesRepo.create({ role: "assistant", text: res.message, tool_calls: [{ tool: call.tool, args: call.args, result: res.message }] });
    bus.emit();
    return res.message;
}
