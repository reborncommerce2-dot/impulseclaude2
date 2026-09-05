// "Cerebro" del agente en este prototipo sin backend: interpreta lenguaje
// natural imperfecto en español y lo traduce a una o más tool calls, tal
// como pide la spec (§13, §39: frases compuestas → múltiples tool calls en
// una sola respuesta). Es un parser heurístico, NO un LLM — está diseñado
// para que reemplazarlo por una Edge Function con tool-calling real
// (Anthropic/OpenAI, ver /backend/edge-functions/ai-agent) sea un cambio de
// una sola función (src/ai/agent.ts), sin tocar ni las tools ni la UI.
function normalize(s) {
    return s.toLowerCase().trim();
}
function parseAmount(raw) {
    let s = raw.replace(/\s/g, "");
    // "5.000" o "5,000" -> separador de miles; "5.5" o "5,5" -> decimal
    if (/^\d{1,3}([.,]\d{3})+$/.test(s)) {
        s = s.replace(/[.,]/g, "");
    }
    else {
        s = s.replace(",", ".");
    }
    return parseFloat(s);
}
const NUM = "(\\d+(?:[.,]\\d+)*)";
// Números en palabras (1-24) para frases como "en los próximos seis meses".
// No cubre toda la numeración en español a propósito — es un prototipo, y
// esto alcanza los casos reales de "en N meses/años/días" imperfectos.
const WORD_NUMBERS = {
    un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7,
    ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
    dieciseis: 16, dieciséis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20,
    veintiuno: 21, veintidos: 22, veintidós: 22, veintitres: 23, veintitrés: 23, veinticuatro: 24,
};
const NUM_OR_WORD = `(\\d+|${Object.keys(WORD_NUMBERS).join("|")})`;
function toNumber(raw) {
    const clean = raw.toLowerCase().trim();
    if (clean in WORD_NUMBERS)
        return WORD_NUMBERS[clean];
    return parseAmount(raw);
}
function splitClauses(text) {
    // separa frases compuestas por comas / " y " manteniendo unidades como
    // "4 cigarrillos, 2 porros y 3 Fernet"
    return text
        .split(/,| y (?=\d)| y (?=tom|beb|fum|com)/gi)
        .map((c) => c.trim())
        .filter(Boolean);
}
// Nota: sin \b al final — \b no detecta borde de palabra correctamente
// después de una vocal acentuada (é, í) en el motor de regex de JS, que no
// trata los acentos como caracteres de palabra.
const CONSUMPTION_VERBS = /\b(fum[eé]|tom[eé]|beb[ií]|consum[ií])/i;
const CONSUMPTION_NOUN = new RegExp(`${NUM}\\s*(cigarrillo|cigarro|porro|fernet|cerveza|birra|vino|whisky|copa|trago|vape)s?`, "i");
function parseConsumptions(text) {
    const calls = [];
    const clauses = splitClauses(text);
    for (const clause of clauses) {
        const m = clause.match(CONSUMPTION_NOUN);
        if (m && CONSUMPTION_VERBS.test(text)) {
            const qty = parseAmount(m[1]);
            let name = m[2].toLowerCase();
            const map = { cigarro: "cigarrillo", birra: "cerveza" };
            name = map[name] ?? name;
            calls.push({
                tool: "log_consumption",
                args: { name: capitalize(pluralToSingularName(name)), quantity: qty },
                label: `${qty} ${name}${qty === 1 ? "" : "s"}`,
            });
        }
    }
    return calls;
}
function pluralToSingularName(n) {
    const known = {
        cigarrillo: "Cigarrillos", porro: "Marihuana", fernet: "Fernet", cerveza: "Cerveza",
        vino: "Vino", whisky: "Whisky", copa: "Alcohol", trago: "Alcohol", vape: "Vape",
    };
    return known[n] ?? n;
}
function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
function parseExpense(text) {
    const m = text.match(new RegExp(`gast[eé]\\s*(?:\\$|usd)?\\s*${NUM}\\s*(?:d[oó]lares|dolares|pesos|usd|\\$)?\\s*(?:en\\s+([a-záéíóúñ\\s]+))?`, "i"));
    if (!m)
        return null;
    const amount = parseAmount(m[1]);
    const category = m[2]?.trim().replace(/\.$/, "");
    return {
        tool: "log_expense",
        args: { amount, category: category ? capitalize(category) : undefined },
        label: `gasto de $${amount}${category ? ` en ${category}` : ""}`,
    };
}
function parseIncome(text) {
    const m = text.match(new RegExp(`(?:cobr[eé]|me pagaron|ingres[eé]|recib[ií])\\s*(?:\\$|usd)?\\s*${NUM}`, "i"));
    if (!m)
        return null;
    const amount = parseAmount(m[1]);
    return { tool: "log_income", args: { amount }, label: `ingreso de $${amount}` };
}
function parseFinancialGoal(text) {
    const m = text.match(new RegExp(`ahorrar\\s*(?:\\$|usd)?\\s*${NUM}\\s*(?:d[oó]lares|dolares|pesos|usd)?[^.]*?(?:en|dentro de)\\s*(?:los?\\s+)?(?:pr[oó]ximos?\\s+)?${NUM_OR_WORD}\\s*(mes|meses|a[ñn]o|a[ñn]os)`, "i"));
    if (!m)
        return null;
    const amount = parseAmount(m[1]);
    const n = toNumber(m[2]);
    const months = /a[ñn]o/i.test(m[3]) ? n * 12 : n;
    return {
        tool: "create_financial_goal",
        args: { title: `Ahorrar $${amount}`, target_amount: amount, months },
        label: `objetivo financiero: ahorrar $${amount} en ${months} meses`,
    };
}
function parseHomeLayout(text) {
    const m = text.match(/(?:pon[eé]|agreg[aá]|sac[aá]|quit[aá])\s+([a-záéíóúñ\s]+?)\s+(?:en|de)\s+(?:mi\s+)?(?:pantalla principal|home|inicio)/i);
    if (!m)
        return null;
    const areaName = m[1].trim();
    const visible = /pon[eé]|agreg[aá]/i.test(m[0]);
    const keyMap = {
        finanzas: "shortcut_finanzas", vicios: "shortcut_vicios", ejercicio: "shortcut_ejercicio",
        alimentaci: "shortcut_alimentacion", objetivos: "shortcut_objetivos",
    };
    const key = Object.entries(keyMap).find(([k]) => areaName.toLowerCase().includes(k))?.[1];
    if (!key)
        return null;
    return {
        tool: "update_home_layout", args: { key, visible },
        label: `${visible ? "mostrar" : "ocultar"} ${areaName} en el Home`,
    };
}
function parseReminder(text, now = new Date()) {
    // Disparador: la palabra "recordame" en cualquier parte del mensaje. La
    // fecha/hora puede estar ANTES ("Mañana a las 9 recordame...") o DESPUÉS
    // ("recordame mañana a las 9..."), así que se busca en todo el texto, no
    // solo en lo que sigue a "recordame".
    if (!/recordame/i.test(text))
        return null;
    let rest = text;
    const date = new Date(now);
    if (/\bmañana\b/i.test(rest)) {
        date.setDate(date.getDate() + 1);
        rest = rest.replace(/\bmañana\b/i, "");
    }
    else if (/\bhoy\b/i.test(rest)) {
        rest = rest.replace(/\bhoy\b/i, "");
    }
    const enDias = rest.match(new RegExp(`en\\s+${NUM_OR_WORD}\\s+d[ií]as?`, "i"));
    if (enDias) {
        date.setDate(date.getDate() + toNumber(enDias[1]));
        rest = rest.replace(enDias[0], "");
    }
    const horaMatch = rest.match(/a las\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm|hs|horas)?/i);
    if (horaMatch) {
        let h = parseInt(horaMatch[1], 10);
        if (/pm/i.test(horaMatch[3] ?? "") && h < 12)
            h += 12;
        date.setHours(h, horaMatch[2] ? parseInt(horaMatch[2], 10) : 0, 0, 0);
        rest = rest.replace(horaMatch[0], "");
    }
    else {
        date.setHours(9, 0, 0, 0);
    }
    rest = rest
        .replace(/recordame/i, "")
        .replace(/^\s*(que|de)\b/i, "")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^[,.]|[,.]$/g, "")
        .trim();
    const title = rest ? capitalize(rest) : "Recordatorio";
    return {
        tool: "create_reminder",
        args: { title, datetime: date.toISOString() },
        label: `recordatorio "${title}" para ${date.toLocaleString("es-AR")}`,
    };
}
function parseWater(text) {
    const m = text.match(new RegExp(`tom[eé]\\s*${NUM}\\s*(litro|l|ml|mililitro)s?\\s*(?:de agua)?`, "i"));
    if (!m || !/agua/i.test(text))
        return null;
    const n = parseAmount(m[1]);
    const ml = /litro|^l$/i.test(m[2]) ? n * 1000 : n;
    return { tool: "log_water", args: { ml }, label: `${ml} ml de agua` };
}
function parseWorkout(text) {
    const m = text.match(new RegExp(`(?:hice|corr[ií])\\s*([a-záéíóúñ\\s]*?)?\\s*(?:${NUM}\\s*min)?`, "i"));
    const kindMatch = text.match(/\b(gimnasio|correr|running|pesas|yoga|nataci[oó]n|bicicleta|caminata)\b/i);
    if (!kindMatch)
        return null;
    const durMatch = text.match(new RegExp(`${NUM}\\s*min`, "i"));
    return {
        tool: "log_workout",
        args: { kind: capitalize(kindMatch[1]), duration_min: durMatch ? parseAmount(durMatch[1]) : undefined },
        label: `ejercicio: ${kindMatch[1]}`,
    };
}
function parseMemory(text) {
    const m = text.match(/^(?:acordate(?:\s+que)?|record[aá]\s+que|guard[aá]\s+que|quiero que sepas que)\s+(.+)/i);
    if (!m)
        return null;
    const fact = capitalize(m[1].trim());
    return { tool: "remember_fact", args: { text: fact }, label: `memoria: "${fact}"` };
}
/** Punto de entrada: intenta extraer TODAS las intenciones de un mensaje. */
export function parseMessage(text) {
    const calls = [];
    const reminder = parseReminder(text);
    if (reminder) {
        calls.push(reminder);
        return calls;
    } // recordatorio es exclusivo del mensaje
    const memory = parseMemory(text);
    if (memory) {
        calls.push(memory);
        return calls;
    }
    const goal = parseFinancialGoal(text);
    if (goal)
        calls.push(goal);
    const home = parseHomeLayout(text);
    if (home) {
        calls.push(home);
        return calls;
    }
    calls.push(...parseConsumptions(text));
    const expense = parseExpense(text);
    if (expense)
        calls.push(expense);
    const income = parseIncome(text);
    if (income)
        calls.push(income);
    const water = parseWater(text);
    if (water)
        calls.push(water);
    const workout = parseWorkout(text);
    if (workout)
        calls.push(workout);
    return calls;
}
