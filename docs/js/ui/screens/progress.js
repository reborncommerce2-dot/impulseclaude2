import { computeScore, whyScoreChanged } from "../../domain/score.js";
import { comparePeriods } from "../../domain/stats.js";
import { scoreRing, areaColor } from "../scoreRing.js";
import { esc } from "../dom.js";
export async function renderProgress() {
    const [score, why, financeCmp, viceCmp] = await Promise.all([
        computeScore(), whyScoreChanged(), comparePeriods("finanzas", 0, -1), comparePeriods("vicios", 0, -1),
    ]);
    return `
    <div class="screen-header"><div class="title">Progreso</div></div>
    <div class="screen" style="padding-top:0">
      <div class="card">
        <div class="score-hero">${scoreRing(score.global, 96)}
          <div><div class="card-title" style="margin-bottom:2px">Score global</div><div class="item-sub">${esc(why)}</div></div>
        </div>
      </div>
      <div class="section-title">Desglose por área</div>
      <div class="card">
        <div class="stack">
          ${score.breakdown.map((b) => `
            <div>
              <div class="row"><span class="item-title">${esc(b.area)}</span><span class="num item-value">${b.score}</span></div>
              <div class="score-bar-track" style="margin-top:6px"><span class="score-bar-fill" style="width:${b.score}%;background:${areaColor(b.area)}"></span></div>
              <div class="item-sub" style="margin-top:5px">${esc(b.reason)}</div>
            </div>`).join("")}
        </div>
      </div>
      <div class="section-title">Tendencia mensual</div>
      <div class="card stack">
        <div class="row"><span class="item-sub">Gastos: ${esc(financeCmp.periodA)} vs ${esc(financeCmp.periodB)}</span>
          <span class="num item-value" style="color:${financeCmp.pctChange !== null && financeCmp.pctChange > 0 ? "var(--negative)" : "var(--positive)"}">${financeCmp.pctChange === null ? "—" : (financeCmp.pctChange > 0 ? "+" : "") + financeCmp.pctChange + "%"}</span></div>
        <div class="row"><span class="item-sub">Vicios: ${esc(viceCmp.periodA)} vs ${esc(viceCmp.periodB)}</span>
          <span class="num item-value" style="color:${viceCmp.pctChange !== null && viceCmp.pctChange > 0 ? "var(--negative)" : "var(--positive)"}">${viceCmp.pctChange === null ? "—" : (viceCmp.pctChange > 0 ? "+" : "") + viceCmp.pctChange + "%"}</span></div>
      </div>
    </div>`;
}
