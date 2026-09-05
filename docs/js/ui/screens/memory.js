import { memoryRepo } from "../../domain/system.js";
import { icon } from "../icons.js";
import { esc } from "../dom.js";
export async function renderMemory() {
    const facts = await memoryRepo.list();
    return `
    <div class="screen-header">
      <button class="icon-btn back" data-nav="home">${icon("back")}</button>
      <div class="title">Memoria de la IA</div>
    </div>
    <div class="screen" style="padding-top:0">
      <p class="item-sub" style="padding:0 2px 14px">Hechos que la IA recuerda entre conversaciones. Los podés borrar cuando quieras — nunca se usan para nada más.</p>
      ${facts.length === 0 ? `<div class="empty">${icon("brain")}<p>Sin memoria guardada todavía. Decile algo como "Acordate que estoy tratando de dejar de fumar".</p></div>` : `
      <div class="card" style="padding:4px 16px">
        ${facts.map((f) => `
          <div class="list-item">
            <div class="item-main"><div class="item-title">${esc(f.text)}</div><div class="item-sub">${f.origin === "usuario" ? "Guardado por vos" : "Inferido por la IA"}</div></div>
            <button class="icon-btn" data-action="forget_memory" data-id="${f.id}" style="width:28px;height:28px;color:var(--negative)">${icon("trash")}</button>
          </div>`).join("")}
      </div>`}
    </div>`;
}
