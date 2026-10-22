/**
 * Adaptador: la agenda necesita la duración de un servicio, y eso es del
 * catálogo. La agenda depende de su puerto (ServiciosDeAgenda) y este
 * adaptador lo cumple usando lo que exporta el módulo de catálogo.
 */
import { catalogo } from "../../catalog/catalog.module.js"
import type { ServiciosDeAgenda } from "../models/agenda.ports.js"

export class ServiciosDesdeCatalogo implements ServiciosDeAgenda {
  async duracion(servicioId: number, opciones: { incluirPausados: boolean }) {
    return (await catalogo.servicioReservable(servicioId, opciones)).duracionMin
  }
}
