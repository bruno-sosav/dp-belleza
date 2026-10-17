/**
 * Datos de contacto del local: los carga la dueña en Ajustes del panel y la
 * web los lee de GET /api/configuracion. El horario sale de la agenda real
 * (GET /api/turnos/horarios), la misma que usa la turnera.
 *
 * Se piden una sola vez por visita y se comparten entre el pie de página, la
 * portada y Contacto.
 */
import { useEffect, useState } from "react"
import { formatTelefono } from "@dp/shared/lib/format"
import { describeOpeningHours } from "../../turnera/data/availability"
import type { OpeningHours } from "../../turnera/data/availability"

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

export type Negocio = {
  nombre: string
  /** Normalizado (549…), para wa.me. Vacío si no se cargó. */
  telefono: string
  direccion: string
  email: string
  /** "Lun a Mié 9 a 19 hs · …", o vacío si no se pudo leer. */
  horario: string
  /** Hasta cuántas horas antes la clienta puede cancelar sola en "Mi turno". */
  cancelacionHoras: number
  /** % de seña que se paga al reservar con Mercado Pago. 0 = sin seña. */
  senaPorcentaje: number
}

let cache: Negocio | null = null
let pedido: Promise<Negocio> | null = null

async function cargar(): Promise<Negocio> {
  const [config, horarios] = await Promise.all([
    fetch(`${BASE}/api/configuracion`).then((r) => (r.ok ? r.json() : null)),
    fetch(`${BASE}/api/turnos/horarios`).then((r) => (r.ok ? (r.json() as Promise<OpeningHours[]>) : null)),
  ])
  return {
    nombre: config?.nombre || "Dp.belleza",
    telefono: config?.telefono ?? "",
    direccion: config?.direccion ?? "",
    email: config?.email ?? "",
    horario: horarios ? describeOpeningHours(horarios) : "",
    cancelacionHoras: Number(config?.cancelacionHoras ?? 24),
    senaPorcentaje: Number(config?.senaPorcentaje ?? 0),
  }
}

/** null mientras carga (o si la API no responde: la web sigue andando sin estos datos). */
export function useNegocio(): Negocio | null {
  const [negocio, setNegocio] = useState(cache)
  useEffect(() => {
    if (cache) return
    pedido ??= cargar()
    pedido
      .then((n) => {
        cache = n
        setNegocio(n)
      })
      .catch(() => {
        pedido = null // se reintenta en la próxima pantalla
      })
  }, [])
  return negocio
}

/** Los datos que están cargados, listos para mostrar. Los vacíos no aparecen. */
export function datosDeContacto(n: Negocio | null) {
  if (!n) return []
  return [
    { label: "Dirección", value: n.direccion },
    { label: "Horario", value: n.horario },
    { label: "Email", value: n.email },
    { label: "WhatsApp", value: n.telefono ? formatTelefono(n.telefono) : "" },
  ].filter((d) => d.value)
}
