import { expensesRepo, goalsRepo, monthSummary } from "../../domain/finance.js";
import { icon } from "../icons.js";
import { esc, fmtMoney, fmtDate } from "../dom.js";
export async function renderFinance() {
    const [summary, expenses, goals] = await Promise.all([monthSummary(), expensesRepo.list(), goalsRepo.list()]);
    const recent = expenses.slice(0, 6);
    const categories = Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1]);
    const maxCat = categories[0]?.[1] ?? 1;
    return `
    <div class="screen-header">
      <button class="icon-btn back" data-nav="home">${icon("back")}</button>
      <div class="title">Finanzas</div>
    </div>
    <div class="screen" style="padding-top:0">
      <div class="card">
        <div class="card-title">Este mes</div>
        <div class="grid-2">
          <div><div class="item-sub">Ingresos</div><div class="num item-value" style="font-size:18px;color:var(--positive)">${fmtMoney(summary.income)}</div></div>
          <div><div class="item-sub">Gastos</div><div class="num item-value" style="font-size:18px;color:var(--negative)">${fmtMoney(summary.expense)}</div></div>
        </div>
        <div class="item-sub" style="margin-top:10px">Balance: <span class="num" style="color:var(--text)">${fmtMoney(summary.balance)}</span></div>
      </div>

      ${categories.length === 0 ? "" : `
      <div class="card">
        <div class="card-title">Por categoría</div>
        <div class="stack">
          ${categories.map(([cat, amt]) => `
            <div class="score-bar-row">
              <span class="label">${esc(cat)}</span>
              <span class="score-bar-track"><span class="score-bar-fill" style="width:${(amt / maxCat) * 100}%;background:var(--area-finanzas)"></span></span>
              <span class="val num">${fmtMoney(amt)}</span>
            </div>`).join("")}
        </div>
      </div>`}

      <div class="section-title">Objetivos financieros</div>
      <div class="card" style="padding:4px 16px">
        ${goals.length === 0 ? `<div class="item-sub" style="padding:12px 0">Sin objetivos financieros. Pedíselo a la IA: "Quiero ahorrar $5000 en 6 meses".</div>` : goals.map((g) => {
        const pct = Math.min(100, Math.round((g.saved_amount / g.target_amount) * 100));
        return `
          <div class="list-item">
            <div class="item-main">
              <div class="item-title">${esc(g.title)}</div>
              <div class="score-bar-track" style="margin-top:6px"><span class="score-bar-fill" style="width:${pct}%;background:var(--area-objetivos)"></span></div>
              <div class="item-sub" style="margin-top:6px">${fmtMoney(g.saved_amount)} de ${fmtMoney(g.target_amount)}${g.target_date ? ` · meta ${fmtDate(g.target_date)}` : ""}</div>
            </div>
            <button class="btn btn-secondary btn-sm" data-sheet="contribute_goal" data-id="${g.id}">Aportar</button>
          </div>`;
    }).join("")}
      </div>

      <div class="section-title">Últimos gastos</div>
      <div class="card" style="padding:4px 16px">
        ${recent.length === 0 ? `<div class="item-sub" style="padding:12px 0">Sin gastos registrados.</div>` : recent.map((e) => `
          <div class="list-item">
            <div class="item-main"><div class="item-title">${esc(e.category)}</div><div class="item-sub">${fmtDate(e.date)}${e.note ? " · " + esc(e.note) : ""}</div></div>
            <span class="num item-value">${fmtMoney(e.amount)}</span>
          </div>`).join("")}
      </div>

      <div class="grid-2" style="margin-top:6px">
        <button class="btn btn-secondary" data-sheet="new_income">${icon("plus")} Ingreso</button>
        <button class="btn btn-primary" data-sheet="new_expense">${icon("plus")} Gasto</button>
      </div>
      <div class="grid-2" style="margin-top:10px">
        <button class="btn btn-secondary" data-sheet="new_budget">Presupuesto</button>
        <button class="btn btn-secondary" data-sheet="new_goal">Objetivo financiero</button>
      </div>
    </div>`;
}
