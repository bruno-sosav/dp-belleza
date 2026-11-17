/**
 * Plata que entró a la caja: al completar un turno, por seña o pedido de Mercado
 * Pago, al vender una gift card, o a mano. "gift_card" es pagar CON una gift card:
 * no es plata nueva (entró cuando se vendió), así que no suma al total del día.
 */
export const MEDIOS_PAGO = ["efectivo", "debito", "credito", "transferencia", "mercadopago", "gift_card"] as const
export type MedioPago = (typeof MEDIOS_PAGO)[number]

export const CONCEPTOS_COBRO = ["sena", "turno", "pedido", "gift_card", "otro"] as const
export type ConceptoCobro = (typeof CONCEPTOS_COBRO)[number]

/** Los que puede anotar la dueña a mano. Los de pedidos entran solos; la venta de una gift card, desde Gift cards. */
export const CONCEPTOS_MANUALES = ["sena", "turno", "otro"] as const

export type Cobro = {
  id: number
  /** "2026-10-19 14:32" */
  fechaHora: string
  monto: number
  medio: MedioPago
  concepto: ConceptoCobro
  descripcion: string | null
  turnoId: number | null
  /** Solo los pagos de pedidos de la tienda. */
  pedidoId: number | null
  clienteId: number | null
  /** Solo pagos de Mercado Pago. */
  mpPagoId: number | null
  /** La gift card vendida (concepto gift_card) o con la que se pagó (medio gift_card). */
  giftCardId: number | null
}

export type NuevoCobro = {
  monto: number
  medio: MedioPago
  concepto: ConceptoCobro
  turnoId?: number | null
  pedidoId?: number | null
  clienteId?: number | null
  descripcion?: string | null
  /** Solo pagos de Mercado Pago: evita que el mismo pago entre dos veces. */
  mpPagoId?: number | null
  giftCardId?: number | null
}

/** Seña o turno dicen de qué turno son; "otro" lleva descripción; con gift card, el código. */
export function problemaDeCobroManual(c: { concepto: ConceptoCobro; medio?: MedioPago; turnoId?: number; descripcion?: string; giftCard?: string }): string | null {
  if (c.medio === "gift_card" && !c.giftCard) return "Escribí el código de la gift card."
  if (c.concepto !== "otro" && !c.turnoId) return "Un cobro de seña o de turno tiene que decir de qué turno es."
  if (c.concepto === "otro" && !c.descripcion) return "Contá en una línea qué es este cobro (por ejemplo, “gift card”)."
  return null
}

/** Los de Mercado Pago son pagos reales: no se borran desde el panel, se devuelven desde Mercado Pago. */
export const sePuedeBorrar = (c: Pick<Cobro, "mpPagoId">) => !c.mpPagoId

/** Lo que entró por cada medio de pago, y el total (sin lo pagado con gift card: esa plata entró al venderla). */
export function totalesPorMedio(cobros: { medio: MedioPago; monto: number }[]) {
  const porMedio = Object.fromEntries(MEDIOS_PAGO.map((m) => [m, 0])) as Record<MedioPago, number>
  for (const c of cobros) porMedio[c.medio] += c.monto
  return { porMedio, total: cobros.filter((c) => c.medio !== "gift_card").reduce((s, c) => s + c.monto, 0) }
}
