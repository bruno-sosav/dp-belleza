/** Cumple ServiciosDeAgenda con lo que exporta el catálogo (duración y precio del servicio). */
import { catalogo } from "../../catalog/catalog.module.js"
import type { ServiciosDeAgenda } from "../models/agenda.ports.js"

export class ServiciosDesdeCatalogo implements ServiciosDeAgenda {
  async duracion(servicioId: number, opciones: { incluirPausados: boolean }) {
    return (await catalogo.servicioReservable(servicioId, opciones)).duracionMin
  }
}
