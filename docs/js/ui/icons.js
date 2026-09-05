// Set reducido de íconos propios en SVG (stroke, 1.75px), sin librerías
// externas — coherente con el enfoque cero-dependencias del proyecto.
const base = (paths) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
export const icons = {
    home: base('<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9"/>'),
    target: base('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.6" fill="currentColor"/>'),
    activity: base('<path d="M3 12h4l2.5 7L14 5l2.5 7H21"/>'),
    flame: base('<path d="M12 3c1 3-3 4-3 8a3 3 0 0 0 6 0c0-1-.5-2-1-2.5.8 2 .3 4-1.5 5.5"/><path d="M8 14a4 4 0 1 0 8 0c0-3-2-4-2-7"/>'),
    chart: base('<path d="M4 20V10"/><path d="M11 20V4"/><path d="M18 20v-7"/>'),
    meal: base('<path d="M6 3v7a2 2 0 0 0 4 0V3"/><path d="M8 10v11"/><path d="M17 3c-1.5 0-3 1.5-3 4s1.5 4 3 4v10"/>'),
    coin: base('<circle cx="12" cy="12" r="8"/><path d="M9.5 15c.3 1 1.2 1.5 2.5 1.5 1.6 0 2.5-.8 2.5-1.8 0-2.4-5-1-5-3.4 0-1 1-1.8 2.5-1.8 1.3 0 2.2.5 2.5 1.5"/><path d="M12 7.5v1"/><path d="M12 15.5v1"/>'),
    droplet: base('<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/>'),
    bell: base('<path d="M6 10a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M10 19a2 2 0 0 0 4 0"/>'),
    menu: base('<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>'),
    plus: base('<path d="M12 5v14"/><path d="M5 12h14"/>'),
    check: base('<path d="M5 13l4 4L19 7"/>'),
    close: base('<path d="M6 6l12 12"/><path d="M18 6 6 18"/>'),
    send: base('<path d="M4 12l16-8-6 16-3-6-7-2Z"/>'),
    chat: base('<path d="M4 5h16v10H8l-4 4V5Z"/>'),
    back: base('<path d="M15 5 8 12l7 7"/>'),
    user: base('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.5-4 4-6 7-6s5.5 2 7 6"/>'),
    brain: base('<path d="M9 4a3 3 0 0 0-3 3v1a3 3 0 0 0-1 5.8 3 3 0 0 0 3 4.2h1V4Z"/><path d="M15 4a3 3 0 0 1 3 3v1a3 3 0 0 1 1 5.8 3 3 0 0 1-3 4.2h-1V4Z"/>'),
    trash: base('<path d="M5 7h14"/><path d="M9 7V5h6v2"/><path d="M7 7l1 12h8l1-12"/>'),
    sparkle: base('<path d="M12 3v4"/><path d="M12 17v4"/><path d="M3 12h4"/><path d="M17 12h4"/><path d="M6 6l2.5 2.5"/><path d="M15.5 15.5 18 18"/><path d="M18 6l-2.5 2.5"/><path d="M8.5 15.5 6 18"/>'),
    mic: base('<rect x="9" y="3" width="6" height="10" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>'),
};
export function icon(name, cls = "") {
    return `<span class="icon ${cls}">${icons[name] ?? icons.target}</span>`;
}
