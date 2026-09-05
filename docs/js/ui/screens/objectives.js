import { objectivesRepo, objectiveItemsRepo, areasRepo } from "../../domain/areas.js";
import { icon } from "../icons.js";
import { esc, fmtDate } from "../dom.js";
export async function renderObjectivesList() {
    const [objectives, areas] = await Promise.all([objectivesRepo.list(), areasRepo.list()]);
    const active = objectives.filter((o) => o.status !== "abandonado");
    return `
    <div class="screen-header">
      <div class="title">Objetivos</div>
    </div>
    <div class="screen" style="padding-top:0">
      ${active.length === 0 ? emptyState() : `
      <div class="card" style="padding:4px 16px">
        ${active.map((o) => {
        const area = areas.find((a) => a.id === o.area_id);
        return `
          <div class="list-item" data-nav="objective_detail" data-id="${o.id}" style="cursor:pointer">
            <span class="dot" style="background:${area?.color ?? "var(--accent)"}"></span>
            <div class="item-main">
              <div class="item-title">${esc(o.title)}</div>
              <div class="item-sub">${o.target_date ? `Meta: ${fmtDate(o.target_date)}` : "Sin fecha límite"} · ${o.status}</div>
            </div>
            <span class="num item-value">${o.progress}%</span>
          </div>`;
    }).join("")}
      </div>`}
      <button class="btn btn-primary btn-block" data-sheet="new_objective" style="margin-top:6px">${icon("plus")} Nuevo objetivo</button>
    </div>`;
}
function emptyState() {
    return `<div class="empty">${icon("target")}<p>Todavía no tenés objetivos activos. Creá uno o pedíselo a la IA: "Quiero ahorrar $2000 en 4 meses".</p></div>`;
}
export async function renderObjectiveDetail(id) {
    const objective = await objectivesRepo.get(id);
    if (!objective)
        return `<div class="screen">No encontrado.</div>`;
    const items = (await objectiveItemsRepo.list()).filter((i) => i.objective_id === id).sort((a, b) => a.order - b.order);
    const groups = { subobjetivo: [], etapa: [], tarea: [] };
    for (const it of items)
        groups[it.type].push(it);
    const labels = { subobjetivo: "Subobjetivos", etapa: "Etapas", tarea: "Tareas" };
    return `
    <div class="screen-header">
      <button class="icon-btn back" data-nav="objectives">${icon("back")}</button>
      <div class="title">${esc(objective.title)}</div>
    </div>
    <div class="screen" style="padding-top:0">
      <div class="card">
        <div class="row"><span class="card-title" style="margin:0">Progreso</span><span class="num item-value">${objective.progress}%</span></div>
        <div class="score-bar-track" style="margin-top:8px"><span class="score-bar-fill" style="width:${objective.progress}%;background:var(--accent)"></span></div>
        ${objective.target_date ? `<div class="item-sub" style="margin-top:8px">Meta: ${fmtDate(objective.target_date)}</div>` : ""}
      </div>
      ${["subobjetivo", "etapa", "tarea"].map((type) => `
        <div class="section-title">${labels[type]}</div>
        <div class="card" style="padding:4px 16px">
          ${groups[type].length === 0 ? `<div class="item-sub" style="padding:12px 0">Sin ${labels[type].toLowerCase()} todavía.</div>` : groups[type].map((it) => `
            <div class="list-item">
              <button class="icon-btn" data-action="toggle_objective_item" data-id="${it.id}" data-done="${it.status !== "completado"}" style="width:28px;height:28px;background:${it.status === "completado" ? "var(--positive)" : "var(--surface-2)"}">
                ${it.status === "completado" ? icon("check") : ""}
              </button>
              <div class="item-main">
                <div class="item-title" style="${it.status === "completado" ? "text-decoration:line-through;color:var(--text-faint)" : ""}">${esc(it.title)}</div>
              </div>
            </div>`).join("")}
          <button class="btn btn-ghost" data-sheet="new_objective_item" data-objective="${id}" data-type="${type}" style="padding:10px 0">${icon("plus")} Agregar ${labels[type].toLowerCase().replace(/s$/, "")}</button>
        </div>`).join("")}
    </div>`;
}
