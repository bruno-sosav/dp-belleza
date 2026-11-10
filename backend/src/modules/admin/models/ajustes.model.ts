/** Claves de ajustes (tabla clave/valor de texto), sus defaults y cuáles ve la web. */

/** Las claves que se pueden leer y cambiar. Cualquier otra fila de la tabla se ignora. */
export const CLAVES_AJUSTES = [
  "nombre_negocio",
  "telefono_negocio",
  "codigo_area_negocio",
  "direccion_negocio",
  "email_negocio",
  "intervalo_turnos_min",
  "cancelacion_horas_minimas",
  "sena_porcentaje",
  "reserva_anticipacion_min_horas",
  "reserva_anticipacion_max_dias",
  "envio_modo",
  "envio_gratis_desde",
  "envio_cp_origen",
  "envio_peso_unidad_g",
  "descuento_cumple_porcentaje",
] as const
export type ClaveAjuste = (typeof CLAVES_AJUSTES)[number]
export type Ajustes = Partial<Record<ClaveAjuste, string>>

/** Si falta o no es un número, se usa esto (lo mismo que dice la migración). */
export const POR_DEFECTO = {
  intervalo_turnos_min: 15,
  cancelacion_horas_minimas: 24,
  sena_porcentaje: 0,
  reserva_anticipacion_min_horas: 2,
  reserva_anticipacion_max_dias: 60,
  envio_gratis_desde: 0,
  envio_peso_unidad_g: 300,
  descuento_cumple_porcentaje: 0,
} as const satisfies Partial<Record<ClaveAjuste, number>>
export type AjusteNumerico = keyof typeof POR_DEFECTO

export function comoNumero(ajustes: Ajustes, clave: AjusteNumerico): number {
  const valor = ajustes[clave]
  const n = Number(valor)
  return valor !== undefined && valor !== "" && Number.isFinite(n) ? n : POR_DEFECTO[clave]
}

/** Envíos de la tienda: desactivado (solo retiro), prueba (simula Andreani) o andreani (la cuenta del local). */
export const MODOS_ENVIO = ["desactivado", "prueba", "andreani"] as const
export type ModoEnvio = (typeof MODOS_ENVIO)[number]

export const modoEnvio = (ajustes: Ajustes): ModoEnvio => (MODOS_ENVIO as readonly string[]).includes(ajustes.envio_modo ?? "") ? (ajustes.envio_modo as ModoEnvio) : "desactivado"

/** El código de área del local (2 a 4 números, sin el 0), o undefined si no está bien cargado. */
export function codigoAreaValido(valor: string | undefined): string | undefined {
  const codigo = valor?.replace(/\D/g, "").replace(/^0/, "")
  return codigo && codigo.length >= 2 && codigo.length <= 4 ? codigo : undefined
}

/** Normaliza un teléfono con un código de área (lo provee el módulo de clientas). null si no sirve. */
export type NormalizadorDeTelefono = (texto: string, codigoArea?: string) => string | null
