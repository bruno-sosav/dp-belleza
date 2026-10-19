/** Puertos del catálogo. Las implementaciones MySQL están en infrastructure/. */
import type { Transaccion } from "../../../core/transaccion.js"
import type { CambiosProducto, Categoria, DatosProducto, Producto, ProductoVendible } from "./producto.js"
import type { CambiosServicio, DatosServicio, Servicio } from "./servicio.js"

export interface ServicioRepository {
  /** Ordenados por categoría y nombre. */
  listar(opciones: { incluirPausados: boolean }): Promise<Servicio[]>
  porId(id: number, opciones: { incluirPausados: boolean }): Promise<Servicio | null>
  crear(datos: DatosServicio): Promise<number>
  /** false si no existe. */
  actualizar(id: number, cambios: CambiosServicio): Promise<boolean>
  /** Las categorías en uso (sin contar la de un servicio), de la más usada a la menos. */
  categoriasEnUso(sinContarServicioId?: number): Promise<string[]>
}

/** Turnos pedidos a futuro de cada servicio, para avisar antes de pausarlo. Lo provee la agenda (appointments). */
export interface TurnosDeServicios {
  pedidosAFuturo(servicioIds: number[]): Promise<Map<number, number>>
}

export interface ProductoRepository {
  listar(filtros: { soloActivos: boolean; categoriaId?: number; texto?: string }): Promise<Producto[]>
  porId(id: number, opciones: { soloActivos: boolean }): Promise<Producto | null>
  crear(datos: DatosProducto): Promise<number>
  actualizar(id: number, cambios: CambiosProducto): Promise<boolean>
  /** De esos productos, los activos, con su precio actual (para una venta). */
  vendibles(ids: number[], tx?: Transaccion): Promise<Map<number, ProductoVendible>>
}

export interface CategoriaRepository {
  listar(opciones: { soloActivas: boolean }): Promise<Categoria[]>
  porId(id: number): Promise<Categoria | null>
  crear(datos: { nombre: string; activo: boolean }): Promise<number>
  actualizar(id: number, cambios: Partial<{ nombre: string; activo: boolean }>): Promise<boolean>
}
