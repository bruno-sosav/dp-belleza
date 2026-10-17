/**
 * Normalizar un teléfono con el código de área del local (Ajustes → Tu
 * negocio), para los números que se escriben sin él.
 *
 * El código se lee de `configuracion` y se guarda un minuto en memoria: se usa
 * en cada reserva y cada alta de clienta, y casi nunca cambia.
 */
import { leerConfig } from "./configuracion.js"
import { normalizarTelefono } from "./models/telefono.js"

let cache: { codigo: string | undefined; hasta: number } | null = null

export async function codigoAreaLocal(): Promise<string | undefined> {
  if (cache && cache.hasta > Date.now()) return cache.codigo
  const valor = (await leerConfig("codigo_area_negocio"))?.replace(/\D/g, "")
  const codigo = valor && valor.length >= 2 && valor.length <= 4 ? valor : undefined
  cache = { codigo, hasta: Date.now() + 60_000 }
  return codigo
}

/** Para cuando la dueña cambia el código en Ajustes: que se use enseguida. */
export function olvidarCodigoArea() {
  cache = null
}

export async function normalizarTelefonoLocal(entrada: string): Promise<string | null> {
  return normalizarTelefono(entrada, await codigoAreaLocal())
}
