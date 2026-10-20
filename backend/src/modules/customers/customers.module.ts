/**
 * Módulo de clientas (customers): acá se ARMA el módulo. Es la "raíz de
 * composición": se crean las implementaciones concretas (MySQL), se inyectan
 * en los casos de uso y se exporta solo lo que el resto del sistema puede usar.
 *
 * Ningún otro módulo importa archivos de adentro de customers/: usan lo que
 * exporta este archivo.
 */
import { unidadDeTrabajoMySql } from "../../core/database/MySqlUnidadDeTrabajo.js"
import type { Transaccion } from "../../core/transaccion.js"
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
} from "./application/casosDeUso.js"
import { separarNombreCompleto } from "./domain/cliente.js"
import { normalizarTelefono } from "./domain/telefono.js"
import { CodigoAreaDesdeConfiguracion } from "./infrastructure/CodigoAreaDesdeConfiguracion.js"
import { MySqlActividadDeClientes } from "./infrastructure/MySqlActividadDeClientes.js"
import { MySqlClienteRepository } from "./infrastructure/MySqlClienteRepository.js"
import { MySqlReasignacionDeCliente, type AlUnirFichas } from "./infrastructure/MySqlReasignacionDeCliente.js"
import { ClientesController } from "./presentation/controllers/clientes.controller.js"
import { rutasPanelClientes } from "./presentation/routes/clientes.routes.js"

// Implementaciones concretas
const repo = new MySqlClienteRepository()
const actividad = new MySqlActividadDeClientes()
// Quienes se anotaron para enterarse de que se unieron dos fichas (recordatorios).
const alUnirFichas: AlUnirFichas[] = []
const reasignacion = new MySqlReasignacionDeCliente(alUnirFichas)
const codigoArea = new CodigoAreaDesdeConfiguracion()

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

  /** Normalizar con un código de área dado (al guardar el WhatsApp del local en Ajustes). */
  normalizarTelefonoCon: normalizarTelefono,

  /** Anotarse para mover lo propio cuando se unen dos fichas (corre dentro de la transacción). */
  alUnirFichas: (escuchar: AlUnirFichas) => {
    alUnirFichas.push(escuchar)
  },

  /** El código de área del local, y olvidarlo cuando la dueña lo cambia. */
  codigoArea: () => codigoArea.obtener(),
  olvidarCodigoArea: () => codigoArea.olvidar(),
}
