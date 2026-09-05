export function scoreRing(value, size = 84, color = "var(--accent)") {
    const r = (size - 10) / 2;
    const c = 2 * Math.PI * r;
    const offset = c * (1 - value / 100);
    return `
  <svg class="score-ring" viewBox="0 0 ${size} ${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="8"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="8"
      stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${offset}"
      transform="rotate(-90 ${size / 2} ${size / 2})"/>
    <text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" fill="var(--text)" font-size="${size * 0.28}" font-family="ui-monospace, monospace" font-weight="700">${value}</text>
  </svg>`;
}
export function areaColor(area) {
    const map = {
        "Ejercicio": "var(--area-ejercicio)", "Alimentación": "var(--area-alimentacion)",
        "Finanzas": "var(--area-finanzas)", "Vicios": "var(--area-vicios)", "Objetivos personales": "var(--area-objetivos)",
    };
    return map[area] ?? "var(--accent)";
}
