import { recentAuditLog } from "../../domain/audit.js";
import { icon } from "../icons.js";
import { esc, fmtDateTime } from "../dom.js";
const MODULE_LABELS = {
    habitos: "Hábitos", objetivos: "Objetivos", finanzas: "Finanzas",
    cronograma: "Cronograma", cuenta: "Cuenta",
};
const ACTION_LABELS = {
    crear: "Creó", editar: "Editó", borrar: "Borró", completar: "Completó",
    reabrir: "Reabrió", crear_gasto: "Registró gasto", crear_objetivo: "Creó objetivo",
    cambiar_autonomia_ia: "Cambió autonomía de la IA", cambiar_permiso_ia: "Cambió un permiso de la IA",
    cambiar_moneda: "Cambió la moneda",
};
export async function renderLegajo() {
    const entries = await recentAuditLog(150);
    return `
    <div class="screen-header">
      <button class="icon-btn back" data-nav="account">${icon("back")}</button>
      <div class="title">Legajo</div>
    </div>
    <div class="screen" style="padding-top:0">
      <p class="item-sub" style="padding:0 2px 14px">Registro de modificaciones importantes: qué cambió, cuándo, y el valor anterior.</p>
      ${entries.length === 0 ? `<div class="empty">${icon("chart")}<p>Todavía no hay movimientos registrados.</p></div>` : `
      <div class="card" style="padding:4px 16px">
        ${entries.map((e) => `
          <div class="list-item">
            <span class="pill">${esc(MODULE_LABELS[e.module] ?? e.module)}</span>
            <div class="item-main">
              <div class="item-title">${esc(ACTION_LABELS[e.action] ?? e.action)}${e.new_value ? ": " + esc(e.new_value) : ""}</div>
              <div class="item-sub">${fmtDateTime(e.created_at)}${e.old_value ? " · antes: " + esc(e.old_value) : ""}</div>
            </div>
          </div>`).join("")}
      </div>`}
    </div>`;
}
