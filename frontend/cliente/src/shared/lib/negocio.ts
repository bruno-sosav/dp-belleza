/** Contacto (GET /api/configuracion) y horario (GET /api/turnos/horarios) del local, pedidos una vez por visita. */
import { useEffect, useState } from "react"
import { formatTelefono } from "@dp/shared/lib/format"
import { describeOpeningHours } from "../../features/turnera/api/disponibilidad.api"
import type { OpeningHours } from "../../features/turnera/api/disponibilidad.api"

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
  /** Reglas de la reserva: con cuántas horas como mínimo y hasta cuántos días para adelante. */
  reservaMinHoras: number
  reservaMaxDias: number
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
    reservaMinHoras: Number(config?.reservaMinHoras ?? 2),
    reservaMaxDias: Number(config?.reservaMaxDias ?? 60),
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
