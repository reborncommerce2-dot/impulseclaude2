import { areasRepo, habitsRepo } from "../domain/areas.js";
import { consumptionsRepo } from "../domain/wellbeing.js";
import { goalsRepo } from "../domain/finance.js";
import { icon } from "./icons.js";
import { esc } from "./dom.js";
function shell(title, body) {
    return `
    <div class="sheet">
      <div class="sheet-handle"></div>
      <div class="row" style="margin-bottom:14px">
        <div class="sheet-title" style="margin:0">${title}</div>
        <button class="icon-btn" data-action="close_sheet">${icon("close")}</button>
      </div>
      ${body}
    </div>`;
}
function field(label, inputHtml) {
    return `<div class="field"><label>${label}</label>${inputHtml}</div>`;
}
export async function renderSheet(id, ctx) {
    switch (id) {
        case "menu":
            return shell("Más", `
        <div class="stack">
          ${[
                ["finance", "Finanzas"], ["wellbeing", "Alimentación · Agua · Ejercicio"],
                ["schedule", "Cronograma"], ["reminders", "Recordatorios"],
                ["account", "Cuenta"], ["memory", "Memoria IA"],
            ].map(([nav, label]) => `<button class="btn btn-secondary btn-block" data-nav-close="${nav}" style="justify-content:flex-start">${label}</button>`).join("")}
        </div>`);
        case "quick_capture":
            return shell("Registro rápido", `
        <p class="item-sub" style="margin:-6px 0 14px">Escribí en lenguaje natural. Ej: "fumé 2 cigarrillos y gasté 5 dólares en el kiosco".</p>
        <form data-action="quick_capture_submit" class="stack">
          <textarea name="text" placeholder="¿Qué querés registrar?" autofocus required></textarea>
          <button class="btn btn-primary btn-block" type="submit">${icon("sparkle")} Interpretar y registrar</button>
        </form>`);
        case "new_habit": {
            const areas = await areasRepo.list();
            return shell("Nuevo hábito", `
        <form data-action="submit:new_habit" class="stack">
          ${field("Nombre", `<input name="name" required placeholder="Ej. Leer 20 minutos" />`)}
          ${field("Área", `<select name="area_id">${areas.map((a) => `<option value="${a.id}">${esc(a.name)}</option>`).join("")}</select>`)}
          <div class="field"><label>Tipo</label><div class="seg">
            ${["contador", "cantidad", "tiempo", "booleano", "escala"].map((t, i) => `<label class="seg-btn ${i === 0 ? "active" : ""}"><input type="radio" name="type" value="${t}" style="display:none" ${i === 0 ? "checked" : ""}/>${t}</label>`).join("")}
          </div></div>
          <div class="field"><label>Polaridad</label><div class="seg">
            <label class="seg-btn active"><input type="radio" name="polarity" value="positivo" style="display:none" checked/>Positivo</label>
            <label class="seg-btn"><input type="radio" name="polarity" value="negativo" style="display:none"/>A reducir</label>
          </div></div>
          <button class="btn btn-primary btn-block" type="submit">Crear hábito</button>
        </form>`);
        }
        case "log_habit": {
            const habit = await habitsRepo.get(ctx.id);
            return shell(`Registrar ${habit?.name ?? ""}`, `
        <form data-action="submit:log_habit" class="stack">
          <input type="hidden" name="habit_id" value="${ctx.id}" />
          ${field(`Valor${habit?.unit ? ` (${habit.unit})` : ""}`, `<input name="value" type="number" step="any" value="1" required />`)}
          <button class="btn btn-primary btn-block" type="submit">Registrar</button>
        </form>`);
        }
        case "new_objective":
            return shell("Nuevo objetivo", `
        <form data-action="submit:new_objective" class="stack">
          ${field("Título", `<input name="title" required placeholder="Ej. Correr una maratón" />`)}
          ${field("Fecha meta (opcional)", `<input name="target_date" type="date" />`)}
          <button class="btn btn-primary btn-block" type="submit">Crear objetivo</button>
        </form>`);
        case "new_objective_item":
            return shell("Agregar ítem", `
        <form data-action="submit:new_objective_item" class="stack">
          <input type="hidden" name="objective_id" value="${ctx.objective}" />
          <input type="hidden" name="type" value="${ctx.type}" />
          ${field("Título", `<input name="title" required />`)}
          <button class="btn btn-primary btn-block" type="submit">Agregar</button>
        </form>`);
        case "new_consumption":
            return shell("Nuevo tipo de consumo", `
        <form data-action="submit:new_consumption" class="stack">
          ${field("Nombre", `<input name="name" required placeholder="Ej. Vapeo" />`)}
          ${field("Unidad", `<input name="unit" value="unidad" />`)}
          ${field("Costo unitario (opcional)", `<input name="unit_cost" type="number" step="any" />`)}
          <button class="btn btn-primary btn-block" type="submit">Crear</button>
        </form>`);
        case "log_consumption": {
            const types = await consumptionsRepo.list();
            const preselect = ctx.id;
            return shell("Registrar consumo", `
        <form data-action="submit:log_consumption" class="stack">
          ${field("Tipo", `<select name="consumption_id">${types.map((t) => `<option value="${t.id}" ${t.id === preselect ? "selected" : ""}>${esc(t.name)}</option>`).join("")}</select>`)}
          ${field("Cantidad", `<input name="quantity" type="number" step="any" value="1" required />`)}
          <label class="row" style="margin:4px 0 4px"><span class="item-sub">Vincular gasto automáticamente</span><input type="checkbox" name="linkExpense" checked /></label>
          <button class="btn btn-primary btn-block" type="submit">Registrar</button>
        </form>`);
        }
        case "new_expense":
            return shell("Nuevo gasto", `
        <form data-action="submit:new_expense" class="stack">
          ${field("Monto (USD)", `<input name="amount" type="number" step="any" required autofocus />`)}
          ${field("Categoría", `<input name="category" placeholder="Ej. Comida" />`)}
          ${field("Nota (opcional)", `<input name="note" />`)}
          <button class="btn btn-primary btn-block" type="submit">Registrar gasto</button>
        </form>`);
        case "new_income":
            return shell("Nuevo ingreso", `
        <form data-action="submit:new_income" class="stack">
          ${field("Monto (USD)", `<input name="amount" type="number" step="any" required autofocus />`)}
          ${field("Categoría", `<input name="category" placeholder="Ej. Sueldo" />`)}
          <button class="btn btn-primary btn-block" type="submit">Registrar ingreso</button>
        </form>`);
        case "new_budget":
            return shell("Nuevo presupuesto", `
        <form data-action="submit:new_budget" class="stack">
          ${field("Monto (USD)", `<input name="amount" type="number" step="any" required />`)}
          ${field("Categoría (vacío = general)", `<input name="category" />`)}
          <button class="btn btn-primary btn-block" type="submit">Crear presupuesto</button>
        </form>`);
        case "new_goal":
            return shell("Nuevo objetivo financiero", `
        <form data-action="submit:new_goal" class="stack">
          ${field("Título", `<input name="title" required placeholder="Ej. Fondo de emergencia" />`)}
          ${field("Monto objetivo (USD)", `<input name="target_amount" type="number" step="any" required />`)}
          ${field("Fecha meta (opcional)", `<input name="target_date" type="date" />`)}
          <button class="btn btn-primary btn-block" type="submit">Crear objetivo</button>
        </form>`);
        case "contribute_goal": {
            const goal = await goalsRepo.get(ctx.id);
            return shell(`Aportar a "${goal?.title ?? ""}"`, `
        <form data-action="submit:contribute_goal" class="stack">
          <input type="hidden" name="goal_id" value="${ctx.id}" />
          ${field("Monto (USD)", `<input name="amount" type="number" step="any" required autofocus />`)}
          <button class="btn btn-primary btn-block" type="submit">Aportar</button>
        </form>`);
        }
        case "log_meal":
            return shell("Registrar comida", `
        <form data-action="submit:log_meal" class="stack">
          ${field("¿Qué comiste?", `<input name="name" required autofocus />`)}
          <button class="btn btn-primary btn-block" type="submit">Registrar</button>
        </form>`);
        case "log_water":
            return shell("Registrar agua", `
        <form data-action="submit:log_water" class="stack">
          <div class="seg" style="margin-bottom:12px">
            ${[250, 500, 750].map((v) => `<button type="button" class="seg-btn" data-action="quick_water" data-ml="${v}">${v} ml</button>`).join("")}
          </div>
          ${field("Cantidad (ml)", `<input name="ml" type="number" value="250" required />`)}
          <button class="btn btn-primary btn-block" type="submit">Registrar</button>
        </form>`);
        case "log_workout":
            return shell("Registrar ejercicio", `
        <form data-action="submit:log_workout" class="stack">
          ${field("Actividad", `<input name="kind" required placeholder="Ej. Gimnasio, running…" autofocus />`)}
          ${field("Duración (min, opcional)", `<input name="duration_min" type="number" />`)}
          <div class="field"><label>Intensidad</label><div class="seg">
            ${["baja", "media", "alta"].map((v, i) => `<label class="seg-btn ${i === 1 ? "active" : ""}"><input type="radio" name="intensity" value="${v}" style="display:none" ${i === 1 ? "checked" : ""}/>${v}</label>`).join("")}
          </div></div>
          <button class="btn btn-primary btn-block" type="submit">Registrar</button>
        </form>`);
        case "new_reminder":
            return shell("Nuevo recordatorio", `
        <form data-action="submit:new_reminder" class="stack">
          ${field("Título", `<input name="title" required placeholder="Ej. Ir al gimnasio" autofocus />`)}
          ${field("Fecha y hora", `<input name="datetime" type="datetime-local" required />`)}
          <button class="btn btn-primary btn-block" type="submit">Crear recordatorio</button>
        </form>`);
        case "new_schedule_event":
            return shell("Nuevo evento", `
        <form data-action="submit:new_schedule_event" class="stack">
          ${field("Título", `<input name="title" required placeholder="Ej. Gimnasio" autofocus />`)}
          <div class="grid-2">
            ${field("Desde", `<input name="start_time" type="time" required value="09:00" />`)}
            ${field("Hasta", `<input name="end_time" type="time" required value="10:00" />`)}
          </div>
          <div class="field"><label>Repetición</label><div class="seg">
            <label class="seg-btn active"><input type="radio" name="recurrence" value="ninguna" style="display:none" checked/>Solo este día</label>
            <label class="seg-btn"><input type="radio" name="recurrence" value="semanal" style="display:none"/>Cada semana</label>
          </div></div>
          ${field("Fecha (si es solo este día)", `<input name="date" type="date" value="${ctx.date ?? ""}" />`)}
          <div class="field"><label>Días (si se repite cada semana)</label><div class="seg">
            ${["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d, i) => `
              <label class="seg-btn"><input type="checkbox" name="weekday" value="${i}" style="display:none"/>${d}</label>`).join("")}
          </div></div>
          <button class="btn btn-primary btn-block" type="submit">Crear evento</button>
        </form>`);
        default:
            return "";
    }
}
