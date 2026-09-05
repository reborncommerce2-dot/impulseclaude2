import { consumptionsRepo, consumptionLogsRepo } from "../../domain/wellbeing.js";
import { icon } from "../icons.js";
import { esc } from "../dom.js";
export async function renderConsumptions() {
    const [types, logs] = await Promise.all([consumptionsRepo.list(), consumptionLogsRepo.list()]);
    const active = types.filter((t) => t.active);
    const todayStr = new Date().toISOString().slice(0, 10);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return `
    <div class="screen-header"><div class="title">Vicios</div></div>
    <div class="screen" style="padding-top:0">
      ${active.length === 0 ? `<div class="empty">${icon("flame")}<p>No hay consumos configurados.</p></div>` : `
      <div class="card" style="padding:4px 16px">
        ${active.map((c) => {
        const todayQty = logs.filter((l) => l.consumption_id === c.id && l.date === todayStr).reduce((s, l) => s + l.quantity, 0);
        const weekQty = logs.filter((l) => l.consumption_id === c.id && l.date >= cutoffStr).reduce((s, l) => s + l.quantity, 0);
        return `
          <div class="list-item">
            <span class="dot" style="background:var(--area-vicios)"></span>
            <div class="item-main">
              <div class="item-title">${esc(c.name)}</div>
              <div class="item-sub">Hoy: ${todayQty} ${c.unit} · 7 días: ${weekQty} ${c.unit}</div>
            </div>
            <button class="btn btn-secondary btn-sm" data-sheet="log_consumption" data-id="${c.id}">Registrar</button>
          </div>`;
    }).join("")}
      </div>`}
      <button class="btn btn-primary btn-block" data-sheet="new_consumption" style="margin-top:6px">${icon("plus")} Nuevo tipo de consumo</button>
    </div>`;
}
