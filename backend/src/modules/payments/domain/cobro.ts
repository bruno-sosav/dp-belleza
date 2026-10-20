/**
 * Un cobro: plata que entró a la caja. Entra de tres lados: al completar un
 * turno, la seña de Mercado Pago (sola) y lo que la dueña anota a mano.
 * Dominio puro.
 */
export const MEDIOS_PAGO = ["efectivo", "debito", "credito", "transferencia", "mercadopago"] as const
export type MedioPago = (typeof MEDIOS_PAGO)[number]

export const CONCEPTOS_COBRO = ["sena", "turno", "otro"] as const
export type ConceptoCobro = (typeof CONCEPTOS_COBRO)[number]

export type Cobro = {
  id: number
  /** "2026-10-19 14:32" */
  fechaHora: string
  monto: number
  medio: MedioPago
  concepto: ConceptoCobro
  descripcion: string | null
  turnoId: number | null
  clienteId: number | null
  /** Solo pagos de Mercado Pago. */
  mpPagoId: number | null
}

export type NuevoCobro = {
  monto: number
  medio: MedioPago
  concepto: ConceptoCobro
  turnoId?: number | null
  clienteId?: number | null
  descripcion?: string | null
  /** Solo pagos de Mercado Pago: evita que el mismo pago entre dos veces. */
  mpPagoId?: number | null
}

/**
 * Por qué no se puede anotar este cobro a mano, o null. Uno de seña o de turno
 * dice de qué turno es; "otro" dice qué fue, para saberlo después.
 */
export function problemaDeCobroManual(c: { concepto: ConceptoCobro; turnoId?: number; descripcion?: string }): string | null {
  if (c.concepto !== "otro" && !c.turnoId) return "Un cobro de seña o de turno tiene que decir de qué turno es."
  if (c.concepto === "otro" && !c.descripcion) return "Contá en una línea qué es este cobro (por ejemplo, “gift card”)."
  return null
}

/** Los de Mercado Pago son pagos reales: no se borran desde el panel, se devuelven desde Mercado Pago. */
export const sePuedeBorrar = (c: Pick<Cobro, "mpPagoId">) => !c.mpPagoId

/** Lo que entró por cada medio de pago, y el total. */
export function totalesPorMedio(cobros: { medio: MedioPago; monto: number }[]) {
  const porMedio = Object.fromEntries(MEDIOS_PAGO.map((m) => [m, 0])) as Record<MedioPago, number>
  for (const c of cobros) porMedio[c.medio] += c.monto
  return { porMedio, total: cobros.reduce((s, c) => s + c.monto, 0) }
}
