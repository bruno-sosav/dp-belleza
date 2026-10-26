/** La clienta: una sola ficha para turnos y tienda, identificada por teléfono. */

export type Cumple = { dia: number; mes: number }

export type Cliente = {
  id: number
  nombre: string
  apellido: string | null
  /** Normalizado: 549 + código de área + número (ver telefono.model.ts). */
  telefono: string
  email: string | null
  /** Solo día y mes: el año no hace falta para saludarla. */
  cumple: Cumple | null
  /** Notas internas de la dueña. La clienta no las ve. */
  notas: string | null
  /** "2026-06-18" */
  clienteDesde: string
}

/** Lo que se guarda de una clienta. El teléfono ya viene normalizado. */
export type DatosCliente = {
  nombre: string
  apellido?: string | null
  telefono: string
  email?: string | null
  cumple?: Cumple | null
  notas?: string | null
}

export type CambiosCliente = Partial<DatosCliente>

/** Actividad en otros módulos, provista por el puerto ActividadDeClientes. */
export type Actividad = {
  /** Turnos completados. */
  visitas: number
  /** Turnos en los que no vino. */
  ausencias: number
  /** Pedidos de la tienda no cancelados. */
  compras: number
  gastado: { turnos: number; tienda: number; total: number }
  /** "2026-10-15", o null si nunca vino. */
  ultimaVisita: string | null
  /** "2026-10-20 14:30", o null si no tiene turnos pedidos. */
  proximoTurno: string | null
}

export const ACTIVIDAD_VACIA: Actividad = {
  visitas: 0,
  ausencias: 0,
  compras: 0,
  gastado: { turnos: 0, tienda: 0, total: 0 },
  ultimaVisita: null,
  proximoTurno: null,
}

export type TurnoDeCliente = { id: number; estado: string; fecha: string; horaInicio: string; servicio: string; precio: number }
export type PedidoDeCliente = { id: number; estado: string; fecha: string; total: number; unidades: number }

// ---------------------------------------------------------------- reglas

const DIAS_DEL_MES = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/** Que el cumpleaños exista (el 29 de febrero sí; el 31 de abril no). */
export function cumpleValido({ dia, mes }: Cumple): boolean {
  return mes >= 1 && mes <= 12 && dia >= 1 && dia <= DIAS_DEL_MES[mes - 1]
}

/** "Ana María Pérez" → nombre "Ana María", apellido "Pérez" (la web lo manda en un campo). */
export function separarNombreCompleto(texto: string): { nombre: string; apellido: string | null } {
  const partes = texto.trim().split(/\s+/)
  if (partes.length === 1) return { nombre: partes[0], apellido: null }
  return { nombre: partes.slice(0, -1).join(" "), apellido: partes[partes.length - 1] }
}

/** Clienta existente que vuelve: solo se completa lo que falta, nunca se pisa (la dueña pudo corregirlo). */
export function datosParaCompletar(existente: Cliente, nuevos: DatosCliente): CambiosCliente {
  const cambios: CambiosCliente = {}
  if (!existente.apellido && nuevos.apellido) cambios.apellido = nuevos.apellido
  if (!existente.email && nuevos.email) cambios.email = nuevos.email
  if (!existente.cumple && nuevos.cumple) cambios.cumple = nuevos.cumple
  return cambios
}

/** Con turnos o compras no se borra (esa plata desaparecería de Finanzas). */
export function motivoParaNoEliminar(nombre: string, uso: { turnos: number; pedidos: number }): string | null {
  if (!uso.turnos && !uso.pedidos) return null
  const partes = [
    uso.turnos && `${uso.turnos} ${uso.turnos === 1 ? "turno" : "turnos"}`,
    uso.pedidos && `${uso.pedidos} ${uso.pedidos === 1 ? "compra" : "compras"}`,
  ].filter(Boolean)
  return `No se puede eliminar a ${nombre}: tiene ${partes.join(" y ")} registrados. Si se borrara, esa plata desaparecería de Finanzas.`
}

/** Ficha que queda al unir: completa lo que falta con la otra, junta notas y usa el teléfono elegido. */
export function fusionarFichas(queda: Cliente, otra: Cliente, telefonoDe: "esta" | "otra"): CambiosCliente {
  return {
    apellido: queda.apellido ?? otra.apellido,
    email: queda.email ?? otra.email,
    cumple: queda.cumple ?? otra.cumple,
    notas: [queda.notas, otra.notas].filter(Boolean).join("\n\n") || null,
    telefono: telefonoDe === "otra" ? otra.telefono : queda.telefono,
  }
}
