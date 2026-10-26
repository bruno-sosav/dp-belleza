/**
 * Colores de los gráficos, validados (daltonismo y contraste) contra el fondo #fdfefb.
 * Tienda y Turnos usan siempre el mismo color; los rojos son la escala de días movidos.
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
