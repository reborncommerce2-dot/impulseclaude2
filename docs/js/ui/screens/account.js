import { ensureProfile, getCurrency } from "../../domain/system.js";
import { getCurrentUser } from "../../auth/authService.js";
import { isConfigured } from "../../core/supabaseClient.js";
import { getSyncStatus } from "../../sync/syncWorker.js";
import { icon } from "../icons.js";
import { esc } from "../dom.js";
const AUTONOMY_LABELS = {
    asistente: "Asistente — analiza y propone, pregunta antes de actuar",
    copiloto: "Copiloto — ejecuta lo rutinario, confirma lo sensible",
    autonomo: "Autónomo — ejecuta casi todo lo permitido",
};
const PERMISSION_LABELS = {
    auto_log: "Registros automáticos",
    create_objectives: "Creación de objetivos",
    create_reminders: "Recordatorios",
    edit_home: "Cambios de Home",
    edit_nav: "Cambios de navegación",
    destructive_actions: "Acciones destructivas (borrar datos)",
};
const CURRENCY_LABELS = { ARS: "Pesos ($)", USD: "Dólares (US$)" };
const SYNC_LABELS = {
    idle: "Sincronizado", syncing: "Sincronizando…", error: "Error al sincronizar",
    not_configured: "Backend no configurado", offline: "Sin conexión",
};
export async function renderAccount() {
    const configured = await isConfigured();
    const [profile, currency, authUser] = await Promise.all([
        ensureProfile(), getCurrency(), configured ? getCurrentUser() : Promise.resolve(null),
    ]);
    const sync = getSyncStatus();
    return `
    <div class="screen-header">
      <button class="icon-btn back" data-nav="home">${icon("back")}</button>
      <div class="title">Cuenta</div>
    </div>
    <div class="screen" style="padding-top:0">
      <div class="card row">
        <div class="row" style="gap:12px">
          <span class="icon-btn">${icon("user")}</span>
          <div><div class="item-title">${esc(profile.name)}</div>
            <div class="item-sub">${authUser?.email ? esc(authUser.email) : (configured ? "Sesión no iniciada" : "Modo local — sin backend conectado")}</div>
          </div>
        </div>
        <span class="badge ${profile.plan === "premium" || profile.premium_unlocked_for_testing ? "premium" : ""}">${profile.premium_unlocked_for_testing ? "Premium (prueba)" : profile.plan}</span>
      </div>

      ${configured ? `
      <div class="section-title">Nube</div>
      <div class="card stack">
        <div class="row">
          <span class="item-sub">Estado</span>
          <span class="item-sub" style="color:${sync.status === "error" ? "var(--negative)" : sync.status === "idle" ? "var(--positive)" : "var(--text-dim)"}">${SYNC_LABELS[sync.status] ?? sync.status}</span>
        </div>
        ${sync.lastError ? `<div class="item-sub" style="color:var(--negative)">${esc(sync.lastError)}</div>` : ""}
        <button class="btn btn-secondary btn-block" data-action="sync_now">${icon("chart")} Sincronizar ahora</button>
        <button class="btn btn-ghost btn-block" data-action="sign_out">${icon("close")} Cerrar sesión</button>
      </div>` : ""}

      <div class="section-title">Autonomía de la IA</div>
      <div class="card stack">
        ${["asistente", "copiloto", "autonomo"].map((level) => `
          <label class="row" style="cursor:pointer">
            <span class="item-sub">${AUTONOMY_LABELS[level]}</span>
            <input type="radio" name="autonomy" value="${level}" data-action="set_autonomy" ${profile.autonomy === level ? "checked" : ""} />
          </label>`).join("")}
      </div>

      <div class="section-title">Permisos de la IA</div>
      <div class="card stack">
        ${Object.entries(PERMISSION_LABELS).map(([key, label]) => `
          <div class="row">
            <span class="item-sub">${label}</span>
            <button class="switch ${profile.permissions[key] ? "on" : ""}" data-action="toggle_permission" data-key="${key}"><span class="knob"></span></button>
          </div>`).join("")}
      </div>

      <div class="section-title">Moneda</div>
      <div class="card stack">
        <div class="seg">
          ${Object.entries(CURRENCY_LABELS).map(([code, label]) => `
            <button class="seg-btn ${currency === code ? "active" : ""}" data-action="set_currency" data-code="${code}">${label}</button>`).join("")}
        </div>
        <div class="item-sub">Se aplica a los gastos, ingresos y objetivos financieros nuevos (los ya registrados no cambian).</div>
      </div>

      <div class="section-title">Datos y privacidad</div>
      <div class="card stack">
        <button class="btn btn-secondary btn-block" data-action="export_data">${icon("chart")} Exportar mis datos (JSON)</button>
        <button class="btn btn-danger btn-block" data-action="delete_all_data">${icon("trash")} Borrar todos mis datos de este dispositivo</button>
      </div>

      <div class="section-title">Más</div>
      <div class="card stack">
        <button class="btn btn-ghost btn-block" data-nav="memory" style="justify-content:space-between">Memoria de la IA ${icon("back")}</button>
        <button class="btn btn-ghost btn-block" data-nav="legajo" style="justify-content:space-between">Legajo ${icon("back")}</button>
      </div>
    </div>`;
}
