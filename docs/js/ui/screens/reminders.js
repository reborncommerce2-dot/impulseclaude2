import { remindersRepo } from "../../domain/system.js";
import { icon } from "../icons.js";
import { esc, fmtDateTime } from "../dom.js";
export async function renderReminders() {
    const all = (await remindersRepo.list()).filter((r) => r.status !== "cancelado");
    const pending = all.filter((r) => r.status === "pendiente").sort((a, b) => a.datetime.localeCompare(b.datetime));
    const done = all.filter((r) => r.status === "hecho");
    return `
    <div class="screen-header">
      <button class="icon-btn back" data-nav="home">${icon("back")}</button>
      <div class="title">Recordatorios</div>
    </div>
    <div class="screen" style="padding-top:0">
      ${pending.length === 0 ? `<div class="empty">${icon("bell")}<p>Sin recordatorios pendientes. Probá pedirle a la IA: "Mañana a las 9 recordame ir al gimnasio".</p></div>` : `
      <div class="card" style="padding:4px 16px">
        ${pending.map((r) => `
          <div class="list-item">
            <button class="icon-btn" data-action="done_reminder" data-id="${r.id}" style="width:28px;height:28px">${icon("check")}</button>
            <div class="item-main"><div class="item-title">${esc(r.title)}</div><div class="item-sub">${fmtDateTime(r.datetime)}${r.repeat !== "ninguna" ? " · " + r.repeat : ""}</div></div>
            <button class="icon-btn" data-action="delete_reminder" data-id="${r.id}" style="width:28px;height:28px;color:var(--negative)">${icon("trash")}</button>
          </div>`).join("")}
      </div>`}
      <button class="btn btn-primary btn-block" data-sheet="new_reminder" style="margin-top:6px">${icon("plus")} Nuevo recordatorio</button>
      ${done.length > 0 ? `
      <div class="section-title">Completados</div>
      <div class="card" style="padding:4px 16px">
        ${done.slice(0, 5).map((r) => `<div class="list-item"><div class="item-main"><div class="item-title" style="color:var(--text-faint);text-decoration:line-through">${esc(r.title)}</div></div></div>`).join("")}
      </div>` : ""}
    </div>`;
}
