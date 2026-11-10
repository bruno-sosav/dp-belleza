/** /api/admin/configuracion. Validaciones en backend/src/modules/admin/schemas/ajustes.schema.ts. */
import { useCallback } from "react"
import { api } from "../../../shared/lib/api"
import { useApi } from "../../../shared/lib/useApi"

/** Todo llega como texto (la tabla es clave/valor). */
export type Configuracion = {
  nombre_negocio: string
  /** Normalizado: 549 + 10 dígitos. */
  telefono_negocio: string
  /** "223": se usa para los teléfonos que se escriben sin código de área. */
  codigo_area_negocio: string
  direccion_negocio: string
  email_negocio: string
  intervalo_turnos_min: string
  /** Hasta cuántas horas antes la clienta puede cancelar desde la web. */
  cancelacion_horas_minimas: string
  /** % de seña al reservar desde la web. "0" = sin seña. */
  sena_porcentaje: string
  /** Reglas de la reserva web (Turnos → Reglas). */
  reserva_anticipacion_min_horas: string
  reserva_anticipacion_max_dias: string
  /** Envíos de la tienda: "desactivado" (solo retiro), "prueba" (simula Andreani) o "andreani". */
  envio_modo: string
  /** Monto de productos desde el que el envío es gratis. "0" = nunca. */
  envio_gratis_desde: string
  /** Código postal desde donde se despacha. */
  envio_cp_origen: string
  /** Gramos por unidad, para cotizar. */
  envio_peso_unidad_g: string
  /** % de descuento en la tienda en el mes del cumpleaños de la clienta. "0" = sin descuento. */
  descuento_cumple_porcentaje: string
}

export type CambiosConfiguracion = Partial<{
  nombre_negocio: string
  telefono_negocio: string
  codigo_area_negocio: string
  direccion_negocio: string
  email_negocio: string
  intervalo_turnos_min: number
  cancelacion_horas_minimas: number
  sena_porcentaje: number
  reserva_anticipacion_min_horas: number
  reserva_anticipacion_max_dias: number
  envio_modo: "desactivado" | "prueba" | "andreani"
  envio_gratis_desde: number
  envio_cp_origen: string
  envio_peso_unidad_g: number
  descuento_cumple_porcentaje: number
}>

export function useConfiguracion() {
  const pedir = useCallback(() => api<Configuracion>("/api/admin/configuracion"), [])
  return useApi(pedir)
}

export function guardarConfiguracion(cambios: CambiosConfiguracion) {
  return api<Configuracion>("/api/admin/configuracion", { metodo: "PATCH", cuerpo: cambios })
}
