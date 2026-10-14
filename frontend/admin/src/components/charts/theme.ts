/**
 * Colores de los gráficos del panel. Validados con el checker de paletas
 * (daltonismo, contraste y escalones) contra la superficie de las tarjetas #fdfefb.
 *
 * - Tienda y Turnos: siempre el mismo color en todos los gráficos.
 * - Rojos: escala de "qué tan movido estuvo el día" (claro = tranquilo, oscuro = muy movido).
 */
export const chartColors = {
  shop: "#2a78d6",
  services: "#1baf7a",
  heat: ["#f29a96", "#ea736e", "#dd4b47", "#bf302d", "#8c1e1c"],
  empty: "#eceee8",
  grid: "#e4e7de",
  axis: "#c9cdc2",
  axisText: "#6b7166",
  surface: "#fdfefb",
  up: "#006300",
  down: "#d03b3b",
}

/** Nivel de rojo 0–4 según qué tan movido estuvo el día respecto del más movido. -1 = sin actividad. */
export function heatLevel(value: number, max: number) {
  if (value <= 0 || max <= 0) return -1
  return Math.min(4, Math.floor((value / max) * 5 - 1e-9))
}
