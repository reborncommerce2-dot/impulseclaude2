import { mealLogsRepo, waterLogsRepo, workoutLogsRepo } from "../../domain/wellbeing.js";
import { icon } from "../icons.js";
import { esc, fmtDateTime } from "../dom.js";
export async function renderWellbeing() {
    const [meals, water, workouts] = await Promise.all([mealLogsRepo.list(), waterLogsRepo.list(), workoutLogsRepo.list()]);
    const todayStr = new Date().toISOString().slice(0, 10);
    const waterToday = water.filter((w) => w.date === todayStr).reduce((s, w) => s + w.ml, 0);
    return `
    <div class="screen-header">
      <button class="icon-btn back" data-nav="home">${icon("back")}</button>
      <div class="title">Bienestar</div>
    </div>
    <div class="screen" style="padding-top:0">
      <div class="card">
        <div class="row"><span class="card-title" style="margin:0">Agua de hoy</span><span class="num item-value">${waterToday} ml</span></div>
        <div class="score-bar-track" style="margin-top:8px"><span class="score-bar-fill" style="width:${Math.min(100, (waterToday / 2000) * 100)}%;background:var(--area-alimentacion)"></span></div>
        <button class="btn btn-secondary btn-block" data-sheet="log_water" style="margin-top:12px">${icon("droplet")} Agregar agua</button>
      </div>

      <div class="section-title">Ejercicio reciente</div>
      <div class="card" style="padding:4px 16px">
        ${workouts.length === 0 ? `<div class="item-sub" style="padding:12px 0">Sin registros.</div>` : workouts.slice(0, 6).map((w) => `
          <div class="list-item">
            <span class="dot" style="background:var(--area-ejercicio)"></span>
            <div class="item-main"><div class="item-title">${esc(w.kind)}</div><div class="item-sub">${fmtDateTime(w.date + "T" + (w.time ?? "00:00"))}</div></div>
            ${w.duration_min ? `<span class="num item-value">${w.duration_min} min</span>` : ""}
          </div>`).join("")}
        <button class="btn btn-ghost" data-sheet="log_workout" style="padding:10px 0">${icon("plus")} Registrar ejercicio</button>
      </div>

      <div class="section-title">Comidas recientes</div>
      <div class="card" style="padding:4px 16px">
        ${meals.length === 0 ? `<div class="item-sub" style="padding:12px 0">Sin registros.</div>` : meals.slice(0, 6).map((m) => `
          <div class="list-item">
            <span class="dot" style="background:var(--area-alimentacion)"></span>
            <div class="item-main"><div class="item-title">${esc(m.name)}</div><div class="item-sub">${fmtDateTime(m.date + "T" + (m.time ?? "00:00"))}</div></div>
          </div>`).join("")}
        <button class="btn btn-ghost" data-sheet="log_meal" style="padding:10px 0">${icon("plus")} Registrar comida</button>
      </div>
    </div>`;
}
