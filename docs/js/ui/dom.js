// Motor de render minimalista. Cada "pantalla" es una función que devuelve
// un string HTML. Re-renderizamos el contenedor completo en cada cambio de
// estado (bus.emit) — para el tamaño de esta app es más simple y confiable
// que un virtual DOM casero, y evita cargar un framework externo por CDN
// (mantiene la app 100% offline, sin dependencias de red).
export function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
export function fmtMoney(n, currency = "ARS") {
    const symbols = { ARS: "$", USD: "US$" };
    const symbol = symbols[currency] ?? currency;
    return `${symbol} ${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}
export function fmtDate(iso) {
    const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}
export function fmtDateTime(iso) {
    const d = new Date(iso);
    return d.toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
export function qs(id) {
    return document.getElementById(id);
}
