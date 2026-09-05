export const ui = {
    route: { screen: "tab", tab: "home" },
    sheet: null,
    sheetCtx: {},
    toast: null,
};
let renderFn = () => { };
export function bindRender(fn) {
    renderFn = fn;
}
export function update() {
    renderFn();
}
export function go(route) {
    ui.route = route;
    ui.sheet = null;
    update();
    document.querySelector(".screen")?.scrollTo?.(0, 0);
}
export function openSheet(id, ctx = {}) {
    ui.sheet = id;
    ui.sheetCtx = ctx;
    update();
}
export function closeSheet() {
    ui.sheet = null;
    ui.sheetCtx = {};
    update();
}
let toastTimer = null;
export function showToast(msg) {
    ui.toast = msg;
    update();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        ui.toast = null;
        update();
    }, 2400);
}
