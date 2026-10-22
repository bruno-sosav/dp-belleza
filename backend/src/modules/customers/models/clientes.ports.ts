/**
 * Puertos del módulo de clientas: lo que el dominio y los casos de uso
 * NECESITAN, sin decir cómo se hace. Las implementaciones (MySQL) están en
 * repositories/ y integrations/, y se conectan en customers.module.ts.
 */
import type { Transaccion } from "../../../core/transaccion.port.js"
import type { Actividad, CambiosCliente, Cliente, DatosCliente, PedidoDeCliente, TurnoDeCliente } from "./cliente.model.js"

export interface ClienteRepository {
  /** `bloquear`: que nadie más la cambie hasta que termine la transacción. */
  porId(id: number, tx?: Transaccion, opciones?: { bloquear?: boolean }): Promise<Cliente | null>
  /** `bloquear`: que nadie más la cree o cambie hasta que termine la transacción. */
  porTelefono(telefono: string, tx?: Transaccion, opciones?: { bloquear?: boolean }): Promise<Cliente | null>
  /** Por nombre, apellido o teléfono; cada palabra tiene que aparecer en algún campo. Vacío = todas. */
  buscar(texto?: string): Promise<Cliente[]>
  /** Devuelve el id. Lanza `conflicto` si el teléfono ya lo tiene otra. */
  crear(datos: DatosCliente, tx?: Transaccion): Promise<number>
  /** false si no existe. Lanza `conflicto` si el teléfono ya lo tiene otra. */
  actualizar(id: number, cambios: CambiosCliente, tx?: Transaccion): Promise<boolean>
  eliminar(id: number, tx?: Transaccion): Promise<void>
  /** Otras fichas que podrían ser la misma persona: mismo nombre y apellido, o mismo email. */
  parecidas(cliente: Cliente): Promise<Cliente[]>
}

/**
 * Lo que hizo cada clienta en el resto del sistema. Lo proveen los módulos de
 * turnos (appointments) y de la tienda (orders): clientas no lee sus tablas.
 */
export interface ActividadDeClientes {
  resumenes(ids: number[]): Promise<Map<number, Actividad>>
  historial(id: number): Promise<{ turnos: TurnoDeCliente[]; pedidos: PedidoDeCliente[] }>
  uso(id: number, tx?: Transaccion): Promise<{ turnos: number; pedidos: number }>
}

/**
 * Al unir dos fichas, cada módulo pasa lo suyo (turnos, pedidos, cobros,
 * recordatorios) de una clienta a la otra. Devuelve cuánto se movió.
 */
export interface ReasignacionDeCliente {
  reasignar(deId: number, aId: number, tx: Transaccion): Promise<{ turnos: number; compras: number }>
}

/** El código de área del local, para los teléfonos que se escriben sin él. Lo proveen los ajustes del negocio (admin). */
export interface CodigoAreaDelLocal {
  obtener(): Promise<string | undefined>
}
