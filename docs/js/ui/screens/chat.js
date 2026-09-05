import { messagesRepo } from "../../domain/system.js";
import { icon } from "../icons.js";
import { esc } from "../dom.js";
const SUGGESTIONS = [
    "Fumé 2 cigarrillos y tomé una cerveza",
    "Gasté 8 dólares en café",
    "Quiero ahorrar $3000 en 6 meses",
    "Mañana a las 9 recordame ir al gimnasio",
    "¿Por qué bajó mi Score?",
];
export async function renderChat() {
    const messages = (await messagesRepo.list()).slice(0, 40).reverse();
    return `
    <div class="screen-header">
      <button class="icon-btn back" data-nav="home">${icon("back")}</button>
      <div class="title">Impulse IA</div>
    </div>
    <div class="screen" style="padding-top:0;display:flex;flex-direction:column">
      <div class="chat-scroll" id="chat-scroll" style="flex:1">
        ${messages.length === 0 ? `
          <div class="empty" style="padding-top:20px">${icon("sparkle")}<p>Contame qué registraste, pedime que cree un objetivo o preguntame por tus estadísticas.</p></div>
          <div class="row" style="flex-wrap:wrap;gap:8px;justify-content:center">
            ${SUGGESTIONS.map((s) => `<button class="suggestion-chip" data-action="chat_suggestion" data-text="${esc(s)}">${esc(s)}</button>`).join("")}
          </div>
        ` : messages.map((m) => `<div class="bubble ${m.role}">${esc(m.text)}</div>`).join("")}
      </div>
      <form class="chat-input-bar" data-action="chat_send">
        <input id="chat-input" type="text" placeholder="Escribí como le hablarías a un asistente…" autocomplete="off" />
        <button type="submit">${icon("send")}</button>
      </form>
    </div>`;
}
