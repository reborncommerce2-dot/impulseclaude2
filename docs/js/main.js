import { ensureDefaultAreas, completeObjectiveItem, createHabit, logHabit, createObjective, addObjectiveItem } from "./domain/areas.js";
import { ensureDefaultConsumptions, createConsumptionType, logConsumption, logMeal, logWater, logWorkout } from "./domain/wellbeing.js";
import { createIncome, createExpense, createBudget, createFinancialGoal, contributeToGoal } from "./domain/finance.js";
import { ensureProfile, setAutonomy, setPermission, createReminder, remindersRepo, toggleHomeModule, forgetMemory, getHomeLayout, setCurrency, } from "./domain/system.js";
import { createScheduleEvent, deleteScheduleEvent } from "./domain/schedule.js";
import { sendMessage } from "./ai/agent.js";
import { bus } from "./core/bus.js";
import { TABLES, dbGetAll, setActiveUser, dropActiveUserDb } from "./core/db.js";
import { isConfigured } from "./core/supabaseClient.js";
import { signIn, signUp, signOut, sendPasswordReset, getCurrentUser, onAuthChange, friendlyAuthError, } from "./auth/authService.js";
import { runSync, startAutoSync } from "./sync/syncWorker.js";
import { bindRender, ui, go, openSheet, closeSheet, showToast, update } from "./ui/state.js";
import { renderHome } from "./ui/screens/home.js";
import { renderObjectivesList, renderObjectiveDetail } from "./ui/screens/objectives.js";
import { renderHabits } from "./ui/screens/habits.js";
import { renderConsumptions } from "./ui/screens/consumptions.js";
import { renderFinance } from "./ui/screens/finance.js";
import { renderWellbeing } from "./ui/screens/wellbeing.js";
import { renderProgress } from "./ui/screens/progress.js";
import { renderReminders } from "./ui/screens/reminders.js";
import { renderAccount } from "./ui/screens/account.js";
import { renderMemory } from "./ui/screens/memory.js";
import { renderChat } from "./ui/screens/chat.js";
import { renderHomeCustomize } from "./ui/screens/homeCustomize.js";
import { renderSchedule } from "./ui/screens/schedule.js";
import { renderLegajo } from "./ui/screens/legajo.js";
import { renderAuth } from "./ui/screens/auth.js";
import { renderSheet } from "./ui/sheets.js";
import { icon } from "./ui/icons.js";
const TABS = [
    { key: "home", label: "Inicio", iconName: "home" },
    { key: "objectives", label: "Objetivos", iconName: "target" },
    { key: "habits", label: "Hábitos", iconName: "activity" },
    { key: "consumptions", label: "Vicios", iconName: "flame" },
    { key: "progress", label: "Progreso", iconName: "chart" },
];
const app = document.getElementById("app");
const LOCAL_MODE_KEY = "impulse_local_mode_ok";
const LOCAL_USER_ID = "modo-local-sin-nube";
// ---------------------------------------------------------------------------
// Estado de autenticación (previo a la app). Mientras `checking` es true no
// se pintó nada todavía — evita un parpadeo de la pantalla de login antes de
// confirmar que ya había una sesión guardada.
// ---------------------------------------------------------------------------
const auth = {
    checking: true,
    configured: false,
    user: null,
    mode: "login",
    error: null,
};
async function renderApp() {
    if (auth.checking)
        return;
    if (auth.configured && !auth.user) {
        app.innerHTML = renderAuth(auth.mode, auth.error, false);
        return;
    }
    if (!auth.configured && !localStorage.getItem(LOCAL_MODE_KEY)) {
        app.innerHTML = renderAuth("login", null, true);
        return;
    }
    const screenHtml = await renderScreen();
    const isHome = ui.route.screen === "tab" && ui.route.tab === "home";
    app.innerHTML = `
    ${isHome ? screenHtml : `<div>${screenHtml}</div>`}
    ${tabbarHtml()}
    ${ui.sheet ? `<div class="sheet-backdrop" data-action="backdrop">${await renderSheet(ui.sheet, ui.sheetCtx)}</div>` : ""}
    ${ui.toast ? `<div class="toast">${ui.toast}</div>` : ""}
  `;
    const chatScroll = document.getElementById("chat-scroll");
    if (chatScroll)
        chatScroll.scrollTop = chatScroll.scrollHeight;
}
async function renderScreen() {
    const r = ui.route;
    if (r.screen === "tab") {
        if (r.tab === "home")
            return renderHome();
        if (r.tab === "objectives")
            return renderObjectivesList();
        if (r.tab === "habits")
            return renderHabits();
        if (r.tab === "consumptions")
            return renderConsumptions();
        if (r.tab === "progress")
            return renderProgress();
    }
    if (r.screen === "objective_detail")
        return renderObjectiveDetail(r.id);
    if (r.screen === "finance")
        return renderFinance();
    if (r.screen === "wellbeing")
        return renderWellbeing();
    if (r.screen === "reminders")
        return renderReminders();
    if (r.screen === "account")
        return renderAccount();
    if (r.screen === "memory")
        return renderMemory();
    if (r.screen === "chat")
        return renderChat();
    if (r.screen === "home_customize")
        return renderHomeCustomize();
    if (r.screen === "schedule")
        return renderSchedule(r.anchorDate);
    if (r.screen === "legajo")
        return renderLegajo();
    return "";
}
function tabbarHtml() {
    if (ui.route.screen !== "tab")
        return "";
    return `
    <button class="fab" data-sheet="quick_capture">${icon("plus")}</button>
    <div class="tabbar">
      ${TABS.map((t) => `
        <button class="tab ${ui.route.screen === "tab" && ui.route.tab === t.key ? "active" : ""}" data-nav="${t.key}">
          ${icon(t.iconName)}<span>${t.label}</span>
        </button>`).join("")}
    </div>`;
}
bindRender(() => { renderApp(); });
bus.on(() => update());
const NAV_MAP = {
    home: () => go({ screen: "tab", tab: "home" }),
    objectives: () => go({ screen: "tab", tab: "objectives" }),
    habits: () => go({ screen: "tab", tab: "habits" }),
    consumptions: () => go({ screen: "tab", tab: "consumptions" }),
    progress: () => go({ screen: "tab", tab: "progress" }),
    finance: () => go({ screen: "finance" }),
    wellbeing: () => go({ screen: "wellbeing" }),
    reminders: () => go({ screen: "reminders" }),
    account: () => go({ screen: "account" }),
    memory: () => go({ screen: "memory" }),
    chat: () => go({ screen: "chat" }),
    home_customize: () => go({ screen: "home_customize" }),
    schedule: () => go({ screen: "schedule", anchorDate: new Date().toISOString().slice(0, 10) }),
    legajo: () => go({ screen: "legajo" }),
};
function num(fd, key) {
    return parseFloat(String(fd.get(key) ?? "0")) || 0;
}
function str(fd, key) {
    return String(fd.get(key) ?? "").trim();
}
async function exportData() {
    const dump = {};
    for (const t of TABLES)
        dump[t] = await dbGetAll(t);
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `impulse-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}
/** Recrea los datos base (perfil, áreas, tipos de consumo) en la base local
 * del usuario activo. Se usa tanto al entrar por primera vez como después de
 * "Borrar todos mis datos". */
async function seedLocalData(nameSeed, emailSeed) {
    await ensureProfile({ name: nameSeed, email: emailSeed });
    await ensureDefaultAreas();
    await ensureDefaultConsumptions();
}
async function deleteAllData() {
    if (!confirm("Esto borra todos tus datos de este dispositivo (si tenés nube conectada, se van a volver a bajar en la próxima sincronización salvo que también los borres del lado del servidor). ¿Confirmás?"))
        return;
    await dropActiveUserDb();
    setActiveUser(null);
    const userId = auth.user?.id ?? LOCAL_USER_ID;
    setActiveUser(userId);
    await seedLocalData(auth.user?.name ?? undefined, auth.user?.email ?? undefined);
    showToast("Todos los datos de este dispositivo fueron eliminados.");
    go({ screen: "tab", tab: "home" });
}
document.addEventListener("click", async (e) => {
    const target = e.target;
    const backdrop = target.closest("[data-action='backdrop']");
    if (backdrop && target === backdrop) {
        closeSheet();
        return;
    }
    const navEl = target.closest("[data-nav]");
    if (navEl) {
        const key = navEl.dataset.nav;
        if (key === "objective_detail")
            go({ screen: "objective_detail", id: navEl.dataset.id });
        else
            NAV_MAP[key]?.();
        return;
    }
    const navCloseEl = target.closest("[data-nav-close]");
    if (navCloseEl) {
        NAV_MAP[navCloseEl.dataset.navClose]?.();
        return;
    }
    const sheetEl = target.closest("[data-sheet]");
    if (sheetEl) {
        const id = sheetEl.dataset.sheet;
        openSheet(id, { id: sheetEl.dataset.id, objective: sheetEl.dataset.objective, type: sheetEl.dataset.type, date: sheetEl.dataset.date });
        return;
    }
    const actionEl = target.closest("[data-action]");
    if (!actionEl)
        return;
    const action = actionEl.dataset.action;
    // ---- Auth ----
    if (action === "auth_goto") {
        auth.mode = actionEl.dataset.mode ?? "login";
        auth.error = null;
        await renderApp();
        return;
    }
    if (action === "continue_local") {
        localStorage.setItem(LOCAL_MODE_KEY, "1");
        await enterApp(LOCAL_USER_ID, undefined, undefined);
        return;
    }
    if (action === "sign_out") {
        await signOut();
        setActiveUser(null);
        auth.user = null;
        auth.mode = "login";
        ui.route = { screen: "tab", tab: "home" };
        await renderApp();
        return;
    }
    if (action === "sync_now") {
        showToast("Sincronizando…");
        const res = await runSync();
        showToast(res.ok ? "Sincronizado." : `No se pudo sincronizar: ${res.reason}`);
        return;
    }
    if (action === "close_sheet") {
        closeSheet();
        return;
    }
    if (action === "toggle_objective_item") {
        await completeObjectiveItem(actionEl.dataset.id, actionEl.dataset.done === "true");
        return;
    }
    if (action === "done_reminder") {
        await remindersRepo.update(actionEl.dataset.id, { status: "hecho" });
        bus.emit();
        return;
    }
    if (action === "delete_reminder") {
        await remindersRepo.remove(actionEl.dataset.id);
        bus.emit();
        return;
    }
    if (action === "toggle_permission") {
        const profile = await ensureProfile();
        const key = actionEl.dataset.key;
        await setPermission(key, !profile.permissions[key]);
        return;
    }
    if (action === "set_currency") {
        await setCurrency(actionEl.dataset.code);
        return;
    }
    if (action === "toggle_home_module") {
        const layout = await getHomeLayout();
        const key = actionEl.dataset.key;
        const current = layout.find((m) => m.key === key)?.visible ?? true;
        await toggleHomeModule(key, !current);
        return;
    }
    if (action === "forget_memory") {
        await forgetMemory(actionEl.dataset.id);
        return;
    }
    if (action === "export_data") {
        await exportData();
        return;
    }
    if (action === "delete_all_data") {
        await deleteAllData();
        return;
    }
    if (action === "quick_water") {
        const input = document.querySelector("input[name='ml']");
        if (input)
            input.value = actionEl.dataset.ml;
        return;
    }
    if (action === "chat_suggestion") {
        const text = actionEl.dataset.text;
        await sendMessage(text);
        return;
    }
    if (action === "schedule_week") {
        if (ui.route.screen !== "schedule")
            return;
        const dir = actionEl.dataset.dir;
        const d = new Date(ui.route.anchorDate + "T00:00:00");
        if (dir === "0")
            go({ screen: "schedule", anchorDate: new Date().toISOString().slice(0, 10) });
        else {
            d.setDate(d.getDate() + (dir === "1" ? 7 : -7));
            go({ screen: "schedule", anchorDate: d.toISOString().slice(0, 10) });
        }
        return;
    }
    if (action === "delete_schedule_event") {
        await deleteScheduleEvent(actionEl.dataset.id);
        return;
    }
});
document.addEventListener("change", async (e) => {
    const target = e.target;
    if (target.name === "autonomy") {
        await setAutonomy(target.value);
    }
    // Feedback visual para los selectores "seg" (radio/checkbox ocultos +
    // label.seg-btn): mueve la clase .active al tocar una opción.
    const input = target;
    const segParent = input.closest(".seg");
    if (segParent && (input.type === "radio" || input.type === "checkbox")) {
        if (input.type === "radio") {
            segParent.querySelectorAll("label.seg-btn").forEach((l) => l.classList.remove("active"));
            input.closest("label.seg-btn")?.classList.add("active");
        }
        else {
            input.closest("label.seg-btn")?.classList.toggle("active", input.checked);
        }
    }
});
document.addEventListener("submit", async (e) => {
    const form = e.target;
    const action = form.dataset.action;
    if (!action)
        return;
    e.preventDefault();
    const fd = new FormData(form);
    // ---- Auth ----
    if (action === "auth_login") {
        auth.error = null;
        try {
            const user = await signIn(str(fd, "email"), str(fd, "password"));
            await enterApp(user.id, user.name ?? undefined, user.email ?? undefined);
        }
        catch (err) {
            auth.error = friendlyAuthError(err);
            await renderApp();
        }
        return;
    }
    if (action === "auth_signup") {
        auth.error = null;
        try {
            const user = await signUp(str(fd, "email"), str(fd, "password"), str(fd, "name"));
            if (user) {
                await enterApp(user.id, user.name ?? str(fd, "name"), user.email ?? undefined);
            }
            else {
                auth.mode = "check_email";
                await renderApp();
            }
        }
        catch (err) {
            auth.error = friendlyAuthError(err);
            await renderApp();
        }
        return;
    }
    if (action === "auth_forgot") {
        auth.error = null;
        try {
            await sendPasswordReset(str(fd, "email"));
            auth.mode = "reset_sent";
            await renderApp();
        }
        catch (err) {
            auth.error = friendlyAuthError(err);
            await renderApp();
        }
        return;
    }
    if (action === "quick_capture_submit") {
        const text = str(fd, "text");
        closeSheet();
        const turn = await sendMessage(text);
        showToast(turn.reply.length > 90 ? turn.reply.slice(0, 90) + "…" : turn.reply);
        if (ui.route.screen === "chat")
            update();
        return;
    }
    if (action === "chat_send") {
        const input = document.getElementById("chat-input");
        const text = input.value.trim();
        if (!text)
            return;
        input.value = "";
        await sendMessage(text);
        return;
    }
    if (!action.startsWith("submit:"))
        return;
    const kind = action.slice(7);
    closeSheet();
    switch (kind) {
        case "new_habit":
            await createHabit({
                area_id: str(fd, "area_id"), name: str(fd, "name"),
                type: str(fd, "type"), polarity: str(fd, "polarity"),
            });
            showToast("Hábito creado.");
            break;
        case "log_habit":
            await logHabit({ habit_id: str(fd, "habit_id"), value: num(fd, "value") });
            showToast("Registrado.");
            break;
        case "new_objective":
            await createObjective({ title: str(fd, "title"), target_date: str(fd, "target_date") || null });
            showToast("Objetivo creado.");
            break;
        case "new_objective_item":
            await addObjectiveItem({ objective_id: str(fd, "objective_id"), type: str(fd, "type"), title: str(fd, "title") });
            showToast("Agregado.");
            break;
        case "new_consumption":
            await createConsumptionType({ name: str(fd, "name"), unit: str(fd, "unit") || "unidad", unit_cost: fd.get("unit_cost") ? num(fd, "unit_cost") : null });
            showToast("Tipo de consumo creado.");
            break;
        case "log_consumption":
            await logConsumption({ consumption_id: str(fd, "consumption_id"), quantity: num(fd, "quantity"), linkExpense: fd.get("linkExpense") === "on" });
            showToast("Consumo registrado.");
            break;
        case "new_expense":
            await createExpense({ amount: num(fd, "amount"), category: str(fd, "category") || "General", note: str(fd, "note") || null });
            showToast("Gasto registrado.");
            break;
        case "new_income":
            await createIncome({ amount: num(fd, "amount"), category: str(fd, "category") || "General" });
            showToast("Ingreso registrado.");
            break;
        case "new_budget":
            await createBudget({ amount: num(fd, "amount"), category: str(fd, "category") || null });
            showToast("Presupuesto creado.");
            break;
        case "new_goal":
            await createFinancialGoal({ title: str(fd, "title"), target_amount: num(fd, "target_amount"), target_date: str(fd, "target_date") || null });
            showToast("Objetivo financiero creado.");
            break;
        case "contribute_goal":
            await contributeToGoal(str(fd, "goal_id"), num(fd, "amount"));
            showToast("Aporte registrado.");
            break;
        case "log_meal":
            await logMeal({ name: str(fd, "name") });
            showToast("Comida registrada.");
            break;
        case "log_water":
            await logWater({ ml: num(fd, "ml") });
            showToast("Agua registrada.");
            break;
        case "log_workout":
            await logWorkout({ kind: str(fd, "kind"), duration_min: fd.get("duration_min") ? num(fd, "duration_min") : null, intensity: str(fd, "intensity") });
            showToast("Ejercicio registrado.");
            break;
        case "new_reminder": {
            const dt = str(fd, "datetime");
            await createReminder({ title: str(fd, "title"), datetime: new Date(dt).toISOString() });
            showToast("Recordatorio creado.");
            if (typeof Notification !== "undefined" && Notification.permission === "default")
                Notification.requestPermission();
            break;
        }
        case "new_schedule_event": {
            const recurrence = str(fd, "recurrence");
            const weekdays = fd.getAll("weekday").map((v) => parseInt(String(v), 10));
            await createScheduleEvent({
                title: str(fd, "title"), start_time: str(fd, "start_time"), end_time: str(fd, "end_time"),
                recurrence, weekdays, date: str(fd, "date") || null,
            });
            showToast("Evento creado.");
            break;
        }
    }
});
/** Entra a la app ya autenticado (o en modo local): apunta la base local al
 * usuario, siembra datos base si hace falta, arranca el sync si corresponde
 * y renderiza. */
async function enterApp(userId, name, email) {
    setActiveUser(userId);
    await seedLocalData(name, email);
    auth.user = { id: userId, name: name ?? null, email: email ?? null };
    auth.error = null;
    // Evita que quede pegada la pantalla en la que estaba el usuario anterior
    // (ej. si cerró sesión desde Cuenta, el siguiente que entre debe ver Home,
    // no Cuenta) — ui.route es un objeto en memoria que sobrevive a un
    // logout/login sin recarga de página.
    ui.route = { screen: "tab", tab: "home" };
    if (auth.configured)
        startAutoSync();
    if ("serviceWorker" in navigator)
        navigator.serviceWorker.register("./sw.js").catch(() => { });
    await renderApp();
}
async function bootstrap() {
    auth.configured = await isConfigured();
    if (!auth.configured) {
        auth.checking = false;
        if (localStorage.getItem(LOCAL_MODE_KEY)) {
            await enterApp(LOCAL_USER_ID);
        }
        else {
            await renderApp();
        }
        return;
    }
    try {
        const user = await getCurrentUser();
        auth.checking = false;
        if (user) {
            await enterApp(user.id, user.name ?? undefined, user.email ?? undefined);
        }
        else {
            await renderApp();
        }
    }
    catch {
        auth.checking = false;
        await renderApp();
    }
    onAuthChange(async (user) => {
        if (user && !auth.user) {
            await enterApp(user.id, user.name ?? undefined, user.email ?? undefined);
        }
        else if (!user && auth.user) {
            setActiveUser(null);
            auth.user = null;
            auth.mode = "login";
            await renderApp();
        }
    });
}
bootstrap();
