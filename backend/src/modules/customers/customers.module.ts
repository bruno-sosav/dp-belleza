/** Raíz de composición de clientas. Los demás módulos usan solo lo que exporta este archivo. */
import { unidadDeTrabajoMySql } from "../../core/database/unidadDeTrabajo.database.js"
import type { Transaccion } from "../../core/transaccion.port.js"
import {
  ActualizarCliente,
  BuscarOCrearCliente,
  BuscarPosiblesDuplicados,
  CrearCliente,
  EliminarCliente,
  ListarClientes,
  NormalizarTelefono,
  UnirClientes,
  VerFichaCliente,
  type EntradaCliente,
} from "./services/clientes.usecases.js"
import { separarNombreCompleto } from "./models/cliente.model.js"
import { normalizarTelefono } from "./models/telefono.model.js"
import { CodigoAreaDesdeAjustes } from "./integrations/codigoArea.adapter.js"
import { ajustes } from "../admin/admin.module.js"
import { MySqlActividadDeClientes } from "./repositories/actividad.queries.js"
import { MySqlClienteRepository } from "./repositories/cliente.repository.js"
import { MySqlReasignacionDeCliente, type AlUnirFichas } from "./integrations/reasignacion.adapter.js"
import { ClientesController } from "./controllers/clientes.controller.js"
import { rutasPanelClientes } from "./controllers/clientes.routes.js"

// Implementaciones concretas
const repo = new MySqlClienteRepository()
const actividad = new MySqlActividadDeClientes()
// Quienes se anotaron para enterarse de que se unieron dos fichas (recordatorios).
const alUnirFichas: AlUnirFichas[] = []
const reasignacion = new MySqlReasignacionDeCliente(alUnirFichas)
const codigoArea = new CodigoAreaDesdeAjustes()

// El WhatsApp del local se normaliza con la misma regla que el de las clientas.
ajustes.conectarTelefonos(normalizarTelefono)

// Casos de uso, con sus dependencias inyectadas
const telefonos = new NormalizarTelefono(codigoArea)
const buscarOCrear = new BuscarOCrearCliente(repo, telefonos)
const controller = new ClientesController({
  listar: new ListarClientes(repo, actividad),
  verFicha: new VerFichaCliente(repo, actividad),
  crear: new CrearCliente(repo, telefonos),
  actualizar: new ActualizarCliente(repo, telefonos),
  eliminar: new EliminarCliente(repo, actividad),
  posiblesDuplicados: new BuscarPosiblesDuplicados(repo),
  unir: new UnirClientes(repo, reasignacion, unidadDeTrabajoMySql),
})

/** Lo que el módulo de clientas ofrece al resto del sistema. */
export const clientes = {
  /** Rutas del panel (/clientes…). Se montan bajo /api/admin, que exige sesión. */
  rutasPanel: rutasPanelClientes(controller),

  /** La reserva web y la tienda: usa la ficha de ese teléfono (sin pisarle nada) o crea una. */
  buscarOCrear: (datos: EntradaCliente, tx: Transaccion) => buscarOCrear.ejecutar(datos, tx),

  /** "Ana María Pérez" → nombre y apellido, como lo guarda la ficha. */
  separarNombreCompleto,

  /** Teléfono normalizado con el código de área del local, o null si no sirve. */
  normalizarTelefono: (texto: string) => telefonos.intentar(texto),

  /** Anotarse para mover lo propio cuando se unen dos fichas (corre dentro de la transacción). */
  alUnirFichas: (escuchar: AlUnirFichas) => {
    alUnirFichas.push(escuchar)
  },
}
