/** Raíz de composición del catálogo: servicios, productos y categorías. */
import { ActualizarProducto, CrearProducto, GestionarCategorias, ListarProductos, VerProducto } from "./services/productos.usecases.js"
import { ActualizarServicio, CrearServicio, ListarServicios, VerServicio } from "./services/servicios.usecases.js"
import type { ServicioReservable } from "./models/servicio.model.js"
import type { Transaccion } from "../../core/transaccion.port.js"
import { MySqlCategoriaRepository } from "./repositories/categoria.repository.js"
import { MySqlProductoRepository } from "./repositories/producto.repository.js"
import { MySqlServicioRepository } from "./repositories/servicio.repository.js"
import { MySqlTurnosDeServicios } from "./repositories/turnosDeServicios.queries.js"
import { CatalogoController } from "./controllers/catalogo.controller.js"
import { rutasPanelCatalogo, rutasServiciosWeb, rutasTiendaWeb } from "./controllers/catalogo.routes.js"

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

  /** Datos del servicio para dar un turno. `incluirPausados`: para reprogramar turnos existentes. */
  servicioReservable: (id: number, opciones?: { incluirPausados?: boolean }): Promise<ServicioReservable> =>
    verServicio.reservable(id, opciones),

  /** Para una venta: de esos productos, los activos con su precio actual. Los que no están, no se pueden vender. */
  productosParaVender: (ids: number[], tx?: Transaccion) => productos.vendibles(ids, tx),
}
