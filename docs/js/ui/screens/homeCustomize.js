import { getHomeLayout } from "../../domain/system.js";
import { icon } from "../icons.js";
import { esc } from "../dom.js";
const LABELS = {
    score: "Score", today: "Resumen de hoy", objectives: "Objetivos activos",
    quick_actions: "Acciones rápidas", for_you: "Para vos",
};
export async function renderHomeCustomize() {
    const layout = (await getHomeLayout()).slice().sort((a, b) => a.order - b.order);
    return `
    <div class="screen-header">
      <button class="icon-btn back" data-nav="home">${icon("back")}</button>
      <div class="title">Personalizar Home</div>
    </div>
    <div class="screen" style="padding-top:0">
      <p class="item-sub" style="padding:0 2px 14px">Elegí qué módulos ver en tu pantalla principal.</p>
      <div class="card stack">
        ${layout.map((m) => `
          <div class="row">
            <span class="item-title">${esc(LABELS[m.key] ?? m.key)}</span>
            <button class="switch ${m.visible ? "on" : ""}" data-action="toggle_home_module" data-key="${m.key}"><span class="knob"></span></button>
          </div>`).join("")}
      </div>
    </div>`;
}
