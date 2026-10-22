/**
 * Los ajustes del negocio (Ajustes en el panel): parámetros que la dueña
 * cambia sin tocar código. La tabla es clave/valor de texto; acá están las
 * claves que existen, sus valores por defecto y cuáles puede ver la web.
 * Dominio puro.
 */

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
} as const satisfies Partial<Record<ClaveAjuste, number>>
export type AjusteNumerico = keyof typeof POR_DEFECTO

export function comoNumero(ajustes: Ajustes, clave: AjusteNumerico): number {
  const valor = ajustes[clave]
  const n = Number(valor)
  return valor !== undefined && valor !== "" && Number.isFinite(n) ? n : POR_DEFECTO[clave]
}

/** El código de área del local (2 a 4 números, sin el 0), o undefined si no está bien cargado. */
export function codigoAreaValido(valor: string | undefined): string | undefined {
  const codigo = valor?.replace(/\D/g, "").replace(/^0/, "")
  return codigo && codigo.length >= 2 && codigo.length <= 4 ? codigo : undefined
}

/** Normaliza un teléfono con un código de área (lo provee el módulo de clientas). null si no sirve. */
export type NormalizadorDeTelefono = (texto: string, codigoArea?: string) => string | null
