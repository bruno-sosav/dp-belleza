/**
 * Casos de uso de clientas. Cada clase es una cosa que se puede HACER con
 * clientas; recibe por constructor los puertos que necesita (inyección de
 * dependencias), así se puede probar con implementaciones en memoria.
 *
 * Acá no hay SQL ni Express: solo reglas del dominio y llamadas a los puertos.
 */
import { conflicto, invalido, noEncontrado } from "../../../core/negocio.error.js"
import type { Transaccion, UnidadDeTrabajo } from "../../../core/transaccion.port.js"
import {
  ACTIVIDAD_VACIA,
  cumpleValido,
  datosParaCompletar,
  fusionarFichas,
  motivoParaNoEliminar,
  type Actividad,
  type CambiosCliente,
  type Cliente,
  type Cumple,
  type PedidoDeCliente,
  type TurnoDeCliente,
} from "../models/cliente.model.js"
import type { ActividadDeClientes, ClienteRepository, CodigoAreaDelLocal, ReasignacionDeCliente } from "../models/clientes.ports.js"
import { normalizarTelefono } from "../models/telefono.model.js"

/** Datos de una clienta como llegan de afuera: el teléfono todavía sin normalizar. */
export type EntradaCliente = {
  nombre: string
  apellido?: string | null
  telefono: string
  email?: string | null
  cumple?: Cumple | null
  notas?: string | null
}

export type ClienteConActividad = Cliente & Actividad

const TELEFONO_INVALIDO = "El teléfono no es válido: revisá que tenga el código de área y el número, por ejemplo 223 555-1234"

/** Normaliza un teléfono con el código de área del local. Lanza `invalido` si no sirve. */
export class NormalizarTelefono {
  constructor(private codigoArea: CodigoAreaDelLocal) {}

  async ejecutar(texto: string): Promise<string> {
    const telefono = normalizarTelefono(texto, await this.codigoArea.obtener())
    if (!telefono) throw invalido(TELEFONO_INVALIDO)
    return telefono
  }

  /** Igual, pero devuelve null en vez de lanzar (para buscar: un teléfono mal escrito simplemente no encuentra nada). */
  async intentar(texto: string): Promise<string | null> {
    return normalizarTelefono(texto, await this.codigoArea.obtener())
  }
}

function validarCumple(cumple: Cumple | null | undefined) {
  if (cumple && !cumpleValido(cumple)) throw invalido("Ese cumpleaños no existe: revisá el día y el mes.")
}

/**
 * La reserva web y la tienda: si la clienta ya existe (por teléfono) se usa
 * su ficha completando lo que le falte; si no, se crea. Corre dentro de la
 * transacción de quien la llama (la reserva o el pedido).
 */
export class BuscarOCrearCliente {
  constructor(
    private repo: ClienteRepository,
    private telefonos: NormalizarTelefono,
  ) {}

  async ejecutar(entrada: EntradaCliente, tx: Transaccion): Promise<number> {
    validarCumple(entrada.cumple)
    const datos = { ...entrada, telefono: await this.telefonos.ejecutar(entrada.telefono) }

    const existente = await this.repo.porTelefono(datos.telefono, tx, { bloquear: true })
    if (existente) {
      const cambios = datosParaCompletar(existente, datos)
      if (Object.keys(cambios).length) await this.repo.actualizar(existente.id, cambios, tx)
      return existente.id
    }
    try {
      return await this.repo.crear(datos, tx)
    } catch (err) {
      // Otra reserva con el mismo teléfono la creó en el medio: se usa esa.
      const ganadora = await this.repo.porTelefono(datos.telefono, tx)
      if (ganadora) return ganadora.id
      throw err
    }
  }
}

export class ListarClientes {
  constructor(
    private repo: ClienteRepository,
    private actividad: ActividadDeClientes,
  ) {}

  async ejecutar(texto?: string): Promise<ClienteConActividad[]> {
    const clientes = await this.repo.buscar(texto)
    const resumenes = await this.actividad.resumenes(clientes.map((c) => c.id))
    return clientes.map((c) => ({ ...c, ...(resumenes.get(c.id) ?? ACTIVIDAD_VACIA) }))
  }
}

export type Ficha = ClienteConActividad & { turnos: TurnoDeCliente[]; pedidos: PedidoDeCliente[] }

export class VerFichaCliente {
  constructor(
    private repo: ClienteRepository,
    private actividad: ActividadDeClientes,
  ) {}

  async ejecutar(id: number): Promise<Ficha> {
    const cliente = await this.repo.porId(id)
    if (!cliente) throw noEncontrado("Cliente")
    const [resumenes, historial] = await Promise.all([this.actividad.resumenes([id]), this.actividad.historial(id)])
    return { ...cliente, ...(resumenes.get(id) ?? ACTIVIDAD_VACIA), ...historial }
  }
}

/** Alta manual desde el panel (las que reservan o compran se crean solas). */
export class CrearCliente {
  constructor(
    private repo: ClienteRepository,
    private telefonos: NormalizarTelefono,
  ) {}

  async ejecutar(entrada: EntradaCliente): Promise<Cliente> {
    validarCumple(entrada.cumple)
    const id = await this.repo.crear({ ...entrada, telefono: await this.telefonos.ejecutar(entrada.telefono) })
    return (await this.repo.porId(id))!
  }
}

export class ActualizarCliente {
  constructor(
    private repo: ClienteRepository,
    private telefonos: NormalizarTelefono,
  ) {}

  async ejecutar(id: number, entrada: Partial<EntradaCliente>): Promise<Cliente> {
    validarCumple(entrada.cumple)
    const { telefono, ...resto } = entrada
    const cambios: CambiosCliente = { ...resto }
    if (telefono !== undefined) cambios.telefono = await this.telefonos.ejecutar(telefono)
    if (Object.keys(cambios).length && !(await this.repo.actualizar(id, cambios))) throw noEncontrado("Cliente")
    const cliente = await this.repo.porId(id)
    if (!cliente) throw noEncontrado("Cliente")
    return cliente
  }
}

/** Solo sin historial (por ejemplo, cargada por error): con turnos o compras, no. */
export class EliminarCliente {
  constructor(
    private repo: ClienteRepository,
    private actividad: ActividadDeClientes,
  ) {}

  async ejecutar(id: number): Promise<void> {
    const cliente = await this.repo.porId(id)
    if (!cliente) throw noEncontrado("Cliente")
    const motivo = motivoParaNoEliminar(cliente.nombre, await this.actividad.uso(id))
    if (motivo) throw conflicto(motivo)
    await this.repo.eliminar(id)
  }
}

export class BuscarPosiblesDuplicados {
  constructor(private repo: ClienteRepository) {}

  async ejecutar(id: number): Promise<Cliente[]> {
    const cliente = await this.repo.porId(id)
    if (!cliente) throw noEncontrado("Cliente")
    return this.repo.parecidas(cliente)
  }
}

/**
 * Unir dos fichas de la misma persona: la `otra` le pasa todo a la que queda
 * (turnos, compras, cobros, recordatorios) y se borra.
 */
export class UnirClientes {
  constructor(
    private repo: ClienteRepository,
    private reasignacion: ReasignacionDeCliente,
    private unidad: UnidadDeTrabajo,
  ) {}

  async ejecutar(id: number, otraId: number, telefonoDe: "esta" | "otra"): Promise<{ turnos: number; compras: number }> {
    if (id === otraId) throw invalido("No se puede unir una ficha consigo misma.")
    return this.unidad.ejecutar(async (tx) => {
      // Se bloquean siempre en el mismo orden (id menor primero), así dos
      // uniones cruzadas al mismo tiempo no se traban entre sí.
      const [primera, segunda] = [Math.min(id, otraId), Math.max(id, otraId)]
      const a = await this.repo.porId(primera, tx, { bloquear: true })
      const b = await this.repo.porId(segunda, tx, { bloquear: true })
      const queda = a?.id === id ? a : b
      const otra = a?.id === id ? b : a
      if (!queda || !otra) throw noEncontrado("Cliente")

      const movido = await this.reasignacion.reasignar(otra.id, queda.id, tx)
      const cambios = fusionarFichas(queda, otra, telefonoDe)
      // Primero se borra la otra: su teléfono es único y queda libre para esta.
      await this.repo.eliminar(otra.id, tx)
      await this.repo.actualizar(queda.id, cambios, tx)
      return movido
    })
  }
}
