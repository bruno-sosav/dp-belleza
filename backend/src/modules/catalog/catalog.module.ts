/**
 * Módulo del catálogo (catalog): servicios, productos, categorías y precios.
 * Raíz de composición: crea las implementaciones MySQL, las inyecta en los
 * casos de uso y exporta solo lo que el resto del sistema puede usar.
 */
import { ActualizarProducto, CrearProducto, GestionarCategorias, ListarProductos, VerProducto } from "./application/productos.js"
import { ActualizarServicio, CrearServicio, ListarServicios, VerServicio } from "./application/servicios.js"
import type { ServicioReservable } from "./domain/servicio.js"
import type { Transaccion } from "../../core/transaccion.js"
import { MySqlCategoriaRepository } from "./infrastructure/MySqlCategoriaRepository.js"
import { MySqlProductoRepository } from "./infrastructure/MySqlProductoRepository.js"
import { MySqlServicioRepository } from "./infrastructure/MySqlServicioRepository.js"
import { MySqlTurnosDeServicios } from "./infrastructure/MySqlTurnosDeServicios.js"
import { CatalogoController } from "./presentation/catalogo.controller.js"
import { rutasPanelCatalogo, rutasServiciosWeb, rutasTiendaWeb } from "./presentation/catalogo.routes.js"

const servicios = new MySqlServicioRepository()
const productos = new MySqlProductoRepository()
const categorias = new MySqlCategoriaRepository()
const turnosDeServicios = new MySqlTurnosDeServicios()

const verServicio = new VerServicio(servicios, turnosDeServicios)
const controller = new CatalogoController({
  listarServicios: new ListarServicios(servicios, turnosDeServicios),
  verServicio,
  crearServicio: new CrearServicio(servicios),
  actualizarServicio: new ActualizarServicio(servicios),
  listarProductos: new ListarProductos(productos),
  verProducto: new VerProducto(productos),
  crearProducto: new CrearProducto(productos, categorias),
  actualizarProducto: new ActualizarProducto(productos, categorias),
  categorias: new GestionarCategorias(categorias),
})

export type { ServicioReservable }

/** Lo que el catálogo ofrece al resto del sistema. */
export const catalogo = {
  /** /servicios para la web: se monta bajo /api/turnos. */
  rutasServiciosWeb: rutasServiciosWeb(controller),
  /** /categorias y /productos para la web: se montan bajo /api/tienda. */
  rutasTiendaWeb: rutasTiendaWeb(controller),
  /** Todo el catálogo para el panel: se monta bajo /api/admin. */
  rutasPanel: rutasPanelCatalogo(controller),

  /**
   * Lo que necesita la agenda de un servicio para dar un turno (id, nombre,
   * precio, duración). `incluirPausados` para reprogramar turnos que ya existían.
   */
  servicioReservable: (id: number, opciones?: { incluirPausados?: boolean }): Promise<ServicioReservable> =>
    verServicio.reservable(id, opciones),

  /** Para una venta: de esos productos, los activos con su precio actual. Los que no están, no se pueden vender. */
  productosParaVender: (ids: number[], tx?: Transaccion) => productos.vendibles(ids, tx),
}
