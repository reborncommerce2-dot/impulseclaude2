import { weekView, WEEKDAY_LABELS } from "../../domain/schedule.js";
import { icon } from "../icons.js";
import { esc } from "../dom.js";
function fmtDayLabel(dateStr, weekday) {
    const d = new Date(dateStr + "T00:00:00");
    return `${WEEKDAY_LABELS[weekday]} ${d.getDate()}`;
}
export async function renderSchedule(anchorDate) {
    const days = await weekView(anchorDate);
    const todayStr = new Date().toISOString().slice(0, 10);
    return `
    <div class="screen-header">
      <button class="icon-btn back" data-nav="home">${icon("back")}</button>
      <div class="title">Cronograma</div>
    </div>
    <div class="screen" style="padding-top:0">
      <div class="row" style="margin-bottom:14px">
        <button class="btn btn-secondary btn-sm" data-action="schedule_week" data-dir="-1">${icon("back")} Semana</button>
        <button class="btn btn-secondary btn-sm" data-action="schedule_week" data-dir="0">Hoy</button>
        <button class="btn btn-secondary btn-sm" data-action="schedule_week" data-dir="1">Semana ${icon("send")}</button>
      </div>
      ${days.map((day) => `
        <div class="section-title" style="${day.date === todayStr ? "color:var(--accent)" : ""}">${fmtDayLabel(day.date, day.weekday)}</div>
        <div class="card" style="padding:4px 16px">
          ${day.events.length === 0 ? `<div class="item-sub" style="padding:10px 0">Sin eventos.</div>` : day.events.map((e) => `
            <div class="list-item">
              <span class="dot" style="background:var(--area-finanzas)"></span>
              <div class="item-main">
                <div class="item-title">${esc(e.title)}</div>
                <div class="item-sub">${e.start_time}–${e.end_time}${e.recurrence === "semanal" ? " · se repite" : ""}${e.note ? " · " + esc(e.note) : ""}</div>
              </div>
              <button class="icon-btn" data-action="delete_schedule_event" data-id="${e.id}" style="width:26px;height:26px;color:var(--negative)">${icon("trash")}</button>
            </div>`).join("")}
          <button class="btn btn-ghost" data-sheet="new_schedule_event" data-date="${day.date}" style="padding:8px 0">${icon("plus")} Agregar evento</button>
        </div>`).join("")}
    </div>`;
}
