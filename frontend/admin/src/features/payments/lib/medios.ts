import type { NombreIcono } from "../../../shared/components/Icono"

/** Medios de pago de la caja, con el texto y el ícono que ve la dueña. Mismo orden que el backend (modules/payments/models/cobro.model.ts). */
export const MEDIOS = [
  { valor: "efectivo", label: "Efectivo", icono: "billete" },
  { valor: "debito", label: "Débito", icono: "tarjeta" },
  { valor: "credito", label: "Crédito", icono: "tarjeta" },
  { valor: "transferencia", label: "Transferencia", icono: "banco" },
  { valor: "mercadopago", label: "Mercado Pago", icono: "celular" },
] as const satisfies readonly { valor: string; label: string; icono: NombreIcono }[]

export type MedioPago = (typeof MEDIOS)[number]["valor"]

export const etiquetaMedio = (m: MedioPago) => MEDIOS.find((x) => x.valor === m)!
