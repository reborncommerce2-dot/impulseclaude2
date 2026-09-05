import { computeScore } from "../../domain/score.js";
import { getHomeLayout, ensureProfile } from "../../domain/system.js";
import { objectivesRepo } from "../../domain/areas.js";
import { todayTotals } from "../../domain/wellbeing.js";
import { areasRepo } from "../../domain/areas.js";
import { icon } from "../icons.js";
import { scoreRing, areaColor } from "../scoreRing.js";
import { esc } from "../dom.js";
const MODULE_TITLES = {
    score: "Score", today: "Hoy", objectives: "Objetivos", quick_actions: "Acciones rápidas", for_you: "Para vos",
};
function forYouMessage(score) {
    const sorted = [...score.breakdown].sort((a, b) => a.score - b.score);
    const lowest = sorted[0];
    if (lowest.score < 55)
        return `Tu área con más margen de mejora es ${lowest.area}. ${lowest.reason}.`;
    return `Venís sólido en todas las áreas. Lo que más pesa hoy: ${lowest.area} (${lowest.score}).`;
}
export async function renderHome() {
    const [layout, profile, score, objectives, totals, areas] = await Promise.all([
        getHomeLayout(), ensureProfile(), computeScore(), objectivesRepo.list(), todayTotals(), areasRepo.list(),
    ]);
    const visible = layout.filter((m) => m.visible).sort((a, b) => a.order - b.order);
    const activeObjectives = objectives.filter((o) => o.status === "activo").slice(0, 3);
    const shortcuts = layout.filter((m) => m.key.startsWith("shortcut_") && m.visible);
    const blocks = {
        score: `
      <div class="card">
        <div class="score-hero">
          ${scoreRing(score.global)}
          <div>
            <div class="card-title" style="margin-bottom:2px">Score de hoy</div>
            <div class="item-sub">Progreso de tu sistema personal, no tu valor.</div>
          </div>
        </div>
        <div class="score-breakdown">
          ${score.breakdown.map((b) => `
            <div class="score-bar-row">
              <span class="label">${esc(b.area)}</span>
              <span class="score-bar-track"><span class="score-bar-fill num" style="width:${b.score}%;background:${areaColor(b.area)}"></span></span>
              <span class="val num">${b.score}</span>
            </div>`).join("")}
        </div>
      </div>`,
        today: `
      <div class="card">
        <div class="card-title">Hoy</div>
        <div class="grid-2">
          <div class="row"><span class="item-sub">${icon("droplet")} Agua</span><span class="num item-value">${totals.water_ml} ml</span></div>
          <div class="row"><span class="item-sub">${icon("activity")} Ejercicio</span><span class="num item-value">${totals.workouts}</span></div>
          <div class="row"><span class="item-sub">${icon("meal")} Comidas</span><span class="num item-value">${totals.meals}</span></div>
          <div class="row"><span class="item-sub">${icon("flame")} Vicios</span><span class="num item-value">${totals.consumptions}</span></div>
        </div>
      </div>`,
        objectives: activeObjectives.length === 0 ? "" : `
      <div class="card">
        <div class="row" style="margin-bottom:10px">
          <div class="card-title" style="margin:0">Objetivos activos</div>
          <button class="link" data-nav="objectives" style="background:none;border:none">Ver todos</button>
        </div>
        ${activeObjectives.map((o) => `
          <div class="list-item" data-nav="objective_detail" data-id="${o.id}" style="cursor:pointer">
            <div class="item-main">
              <div class="item-title">${esc(o.title)}</div>
              <div class="score-bar-track" style="margin-top:6px"><span class="score-bar-fill" style="width:${o.progress}%;background:var(--accent)"></span></div>
            </div>
            <span class="num item-value">${o.progress}%</span>
          </div>`).join("")}
      </div>`,
        quick_actions: `
      <div class="grid-2">
        <button class="quick-tile" data-sheet="log_consumption">${icon("flame")}<span class="item-title">Vicio</span><span class="item-sub">Registrar consumo</span></button>
        <button class="quick-tile" data-sheet="new_expense">${icon("coin")}<span class="item-title">Gasto</span><span class="item-sub">Registrar gasto</span></button>
        <button class="quick-tile" data-sheet="log_water">${icon("droplet")}<span class="item-title">Agua</span><span class="item-sub">Sumar vaso/botella</span></button>
        <button class="quick-tile" data-sheet="log_workout">${icon("activity")}<span class="item-title">Ejercicio</span><span class="item-sub">Registrar actividad</span></button>
      </div>`,
        for_you: `
      <div class="card">
        <div class="row"><span class="card-title" style="margin:0">Para vos</span>${icon("sparkle")}</div>
        <p class="item-sub" style="margin-top:6px">${esc(forYouMessage(score))}</p>
      </div>`,
    };
    const shortcutBlock = shortcuts.length === 0 ? "" : `
    <div class="grid-2" style="margin-bottom:12px">
      ${shortcuts.map((s) => {
        const kind = s.key.replace("shortcut_", "");
        const area = areas.find((a) => a.kind === kind);
        if (!area)
            return "";
        return `<div class="quick-tile"><span class="dot" style="background:${area.color}"></span><span class="item-title">${esc(area.name)}</span></div>`;
    }).join("")}
    </div>`;
    return `
    <div class="topbar">
      <div>
        <div class="greeting">Hola, ${esc(profile.name)}</div>
        <div class="title">Impulse</div>
      </div>
      <div class="row" style="gap:8px">
        <button class="icon-btn" data-nav="chat">${icon("chat")}</button>
        <button class="icon-btn" data-sheet="menu">${icon("menu")}</button>
      </div>
    </div>
    <div class="screen" id="screen-body">
      ${shortcutBlock}
      ${visible.map((m) => blocks[m.key] ?? "").join("")}
      <div style="text-align:center;padding-top:6px">
        <button class="link" data-nav="home_customize" style="background:none;border:none">Personalizar Home</button>
      </div>
    </div>`;
}
