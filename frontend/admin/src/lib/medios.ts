/** Medios de pago de la caja, con el texto y el ícono que ve la dueña. Mismo orden que el backend (modules/payments/domain/cobro.ts). */
export const MEDIOS = [
  { valor: "efectivo", label: "Efectivo", icono: "💵" },
  { valor: "debito", label: "Débito", icono: "💳" },
  { valor: "credito", label: "Crédito", icono: "💳" },
  { valor: "transferencia", label: "Transferencia", icono: "🏦" },
  { valor: "mercadopago", label: "Mercado Pago", icono: "📱" },
] as const

export type MedioPago = (typeof MEDIOS)[number]["valor"]

export const etiquetaMedio = (m: MedioPago) => MEDIOS.find((x) => x.valor === m)!
