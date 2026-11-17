/**
 * Gift cards. Dominio puro: el código, el saldo y qué se puede hacer con ellas.
 * La plata que entra al venderlas es de la caja (payments); acá solo el saldo.
 */

/** Sin 0/O ni 1/I: se dictan por teléfono y se copian a mano. */
export const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
export const LARGO_CODIGO = 8

export const MONTO_MINIMO = 5_000
export const MONTO_MAXIMO = 500_000

export const ESTADOS_GIFT_CARD = ["pendiente_pago", "activa", "anulada"] as const
export type EstadoGiftCard = (typeof ESTADOS_GIFT_CARD)[number]
export type Origen = "web" | "local"

export type GiftCard = {
  id: number
  /** Sin guion: "AB3KXY7Q". Para mostrar, `mostrarCodigo`. */
  codigo: string
  monto: number
  saldo: number
  estado: EstadoGiftCard
  origen: Origen
  comprador: { nombre: string; telefono: string | null; email: string | null }
  /** Para quién es (lo que se imprime en la tarjeta). */
  para: string | null
  mensaje: string | null
  activadaAt: string | null
  creadaEn: string
}

export type TipoMovimiento = "carga" | "uso" | "reintegro" | "anulacion"

export type Movimiento = {
  id: number
  fechaHora: string
  tipo: TipoMovimiento
  monto: number
  saldoDespues: number
  pedidoId: number | null
  descripcion: string | null
}

/** Un código nuevo a partir de bytes al azar (crypto). Cada byte elige una letra: 256 es múltiplo de 32. */
export function generarCodigo(bytes: Uint8Array): string {
  if (bytes.length < LARGO_CODIGO) throw new Error(`Hacen falta ${LARGO_CODIGO} bytes`)
  return Array.from(bytes.subarray(0, LARGO_CODIGO), (b) => ALFABETO[b % ALFABETO.length]).join("")
}

/** "ab3k-xy7q", "AB3K XY7Q" → "AB3KXY7Q". null si no puede ser un código nuestro. */
export function normalizarCodigo(texto: string): string | null {
  const limpio = texto.toUpperCase().replace(/[^A-Z0-9]/g, "")
  if (limpio.length !== LARGO_CODIGO) return null
  return [...limpio].every((c) => ALFABETO.includes(c)) ? limpio : null
}

/** "AB3KXY7Q" → "AB3K-XY7Q". */
export const mostrarCodigo = (codigo: string) => `${codigo.slice(0, 4)}-${codigo.slice(4)}`

export const redondear = (n: number) => Math.round(n * 100) / 100

/** Por qué no se puede usar (o null si se puede). */
export function problemaParaUsar(g: Pick<GiftCard, "estado" | "saldo">): string | null {
  if (g.estado === "pendiente_pago") return "Esa gift card todavía no se pagó."
  if (g.estado === "anulada") return "Esa gift card está anulada."
  if (g.saldo <= 0) return "Esa gift card ya no tiene saldo."
  return null
}

/** Cuánto se descuenta de una compra: todo el saldo, o lo que cueste si sale menos. */
export const cuantoSeUsa = (saldo: number, total: number) => redondear(Math.max(0, Math.min(saldo, total)))

/** La referencia que viaja en el pago de Mercado Pago. */
export const referenciaDeGiftCard = (id: number) => `giftcard-${id}`

/** Un pago como lo informa la pasarela, ya traducido. */
export type PagoDeGiftCard = { id: number; aprobado: boolean; monto: number; referencia: string | null }

/** El pago puede llegar dos veces o tarde: solo se aplica uno aprobado, por el monto, a una que espera el pago. */
export const seAplicaElPago = (g: Pick<GiftCard, "estado" | "monto">, pago: Pick<PagoDeGiftCard, "aprobado" | "monto">) =>
  pago.aprobado && g.estado === "pendiente_pago" && pago.monto + 0.01 >= g.monto

/** Se anula solo si no se usó: si ya se gastó una parte, lo que queda se devuelve a mano. */
export function problemaParaAnular(g: Pick<GiftCard, "estado" | "saldo" | "monto">): string | null {
  if (g.estado === "anulada") return "Esa gift card ya está anulada."
  if (g.estado === "activa" && g.saldo < g.monto) return "Esa gift card ya se usó en parte: no se puede anular."
  return null
}
