/**
 * Implementaciones EN MEMORIA de los puertos de clientas, para probar los
 * casos de uso sin MySQL. Es lo que permite la clean architecture: los casos
 * de uso solo conocen las interfaces, así que se les puede pasar cualquier
 * implementación.
 */
import { conflicto } from "../../src/core/negocio.error.js"
import type { Transaccion, UnidadDeTrabajo } from "../../src/core/transaccion.port.js"
import type { Actividad, CambiosCliente, Cliente, DatosCliente } from "../../src/modules/customers/models/cliente.model.js"
import type { ActividadDeClientes, ClienteRepository, CodigoAreaDelLocal, ReasignacionDeCliente } from "../../src/modules/customers/models/clientes.ports.js"

export class ClientesEnMemoria implements ClienteRepository {
  filas = new Map<number, Cliente>()
  private siguiente = 1

  async porId(id: number) {
    return this.filas.get(id) ?? null
  }
  async porTelefono(telefono: string) {
    return [...this.filas.values()].find((c) => c.telefono === telefono) ?? null
  }
  async buscar(texto?: string) {
    const t = texto?.toLowerCase() ?? ""
    return [...this.filas.values()].filter((c) => !t || `${c.nombre} ${c.apellido ?? ""} ${c.telefono}`.toLowerCase().includes(t))
  }
  async crear(d: DatosCliente) {
    if (await this.porTelefono(d.telefono)) throw conflicto("Ese teléfono ya lo tiene otra clienta.")
    const id = this.siguiente++
    this.filas.set(id, { id, nombre: d.nombre, apellido: d.apellido ?? null, telefono: d.telefono, email: d.email ?? null, cumple: d.cumple ?? null, notas: d.notas ?? null, clienteDesde: "2026-10-19" })
    return id
  }
  async actualizar(id: number, cambios: CambiosCliente) {
    const c = this.filas.get(id)
    if (!c) return false
    if (cambios.telefono && [...this.filas.values()].some((o) => o.id !== id && o.telefono === cambios.telefono)) {
      throw conflicto("Ese teléfono ya lo tiene otra clienta.")
    }
    const limpio = Object.fromEntries(Object.entries(cambios).filter(([, v]) => v !== undefined))
    this.filas.set(id, { ...c, ...limpio } as Cliente)
    return true
  }
  async eliminar(id: number) {
    this.filas.delete(id)
  }
  async parecidas(c: Cliente) {
    return [...this.filas.values()].filter((o) => o.id !== c.id && o.nombre === c.nombre && o.apellido === c.apellido && c.apellido !== null)
  }
}

/** Actividad fija por clienta (lo que en producción proveen turnos y la tienda). */
export class ActividadFija implements ActividadDeClientes {
  uso_ = new Map<number, { turnos: number; pedidos: number }>()
  async resumenes(ids: number[]) {
    return new Map<number, Actividad>(ids.map((id) => [id, { visitas: this.uso_.get(id)?.turnos ?? 0, ausencias: 0, compras: this.uso_.get(id)?.pedidos ?? 0, gastado: { turnos: 0, tienda: 0, total: 0 }, ultimaVisita: null, proximoTurno: null }]))
  }
  async historial() {
    return { turnos: [], pedidos: [] }
  }
  async uso(id: number) {
    return this.uso_.get(id) ?? { turnos: 0, pedidos: 0 }
  }
}

export class ReasignacionAnotada implements ReasignacionDeCliente {
  llamadas: [number, number][] = []
  async reasignar(deId: number, aId: number) {
    this.llamadas.push([deId, aId])
    return { turnos: 2, compras: 1 }
  }
}

export const codigoArea223: CodigoAreaDelLocal = { obtener: async () => "223" }

/** "Transacción" en memoria: corre el trabajo y listo. */
export const unidadEnMemoria: UnidadDeTrabajo = { ejecutar: (trabajo) => trabajo({} as Transaccion) }
export const tx = {} as Transaccion
