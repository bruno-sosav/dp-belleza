/**
 * Implementa el puerto CodigoAreaDelLocal leyendo la configuración del negocio
 * (Ajustes → Tu negocio). Se guarda un minuto en memoria: se usa en cada
 * reserva y cada alta de clienta, y casi nunca cambia.
 *
 * TRANSITORIO en cuanto a de dónde lo lee: cuando se mude la configuración al
 * módulo admin/, este archivo le pide el dato a ese módulo.
 */
import { leerConfig } from "../../../shared/configuracion.js"
import type { CodigoAreaDelLocal } from "../domain/ports.js"

export class CodigoAreaDesdeConfiguracion implements CodigoAreaDelLocal {
  private cache: { codigo: string | undefined; hasta: number } | null = null

  async obtener() {
    if (this.cache && this.cache.hasta > Date.now()) return this.cache.codigo
    const valor = (await leerConfig("codigo_area_negocio"))?.replace(/\D/g, "")
    const codigo = valor && valor.length >= 2 && valor.length <= 4 ? valor : undefined
    this.cache = { codigo, hasta: Date.now() + 60_000 }
    return codigo
  }

  olvidar() {
    this.cache = null
  }
}
