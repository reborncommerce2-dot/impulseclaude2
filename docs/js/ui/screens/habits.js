import { habitsRepo, areasRepo, habitLogsRepo } from "../../domain/areas.js";
import { icon } from "../icons.js";
import { esc as e2 } from "../dom.js";
export async function renderHabits() {
    const [habits, areas, logs] = await Promise.all([habitsRepo.list(), areasRepo.list(), habitLogsRepo.list()]);
    const active = habits.filter((h) => h.active);
    const todayStr = new Date().toISOString().slice(0, 10);
    return `
    <div class="screen-header"><div class="title">Hábitos</div></div>
    <div class="screen" style="padding-top:0">
      ${active.length === 0 ? `<div class="empty">${icon("activity")}<p>Todavía no creaste hábitos. Empezá desde un área o pedíselo a la IA.</p></div>` : `
      <div class="card" style="padding:4px 16px">
        ${active.map((h) => {
        const area = areas.find((a) => a.id === h.area_id);
        const todayVal = logs.filter((l) => l.habit_id === h.id && l.date === todayStr).reduce((s, l) => s + l.value, 0);
        return `
          <div class="list-item">
            <span class="dot" style="background:${area?.color ?? "var(--accent)"}"></span>
            <div class="item-main">
              <div class="item-title">${e2(h.name)}</div>
              <div class="item-sub">${e2(area?.name ?? "")} · ${h.polarity === "positivo" ? "hábito positivo" : "hábito a reducir"}</div>
            </div>
            <span class="num item-value" style="margin-right:6px">${todayVal}${h.unit ? " " + e2(h.unit) : ""}</span>
            <button class="btn btn-secondary btn-sm" data-sheet="log_habit" data-id="${h.id}">+1</button>
          </div>`;
    }).join("")}
      </div>`}
      <button class="btn btn-primary btn-block" data-sheet="new_habit" style="margin-top:6px">${icon("plus")} Nuevo hábito</button>
    </div>`;
}
