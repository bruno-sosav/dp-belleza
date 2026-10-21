/** Casos de uso de productos y categorías de la tienda. */
import { invalido, noEncontrado } from "../../../core/negocio.error.js"
import type { CategoriaRepository, ProductoRepository } from "../domain/catalogo.ports.js"
import type { CambiosProducto, Categoria, DatosProducto, Producto } from "../domain/producto.model.js"

export class ListarProductos {
  constructor(private repo: ProductoRepository) {}

  /** La tienda: solo los activos de categorías activas, filtrables. */
  publicos(filtros: { categoriaId?: number; texto?: string }): Promise<Producto[]> {
    return this.repo.listar({ soloActivos: true, ...filtros })
  }

  paraElPanel(): Promise<Producto[]> {
    return this.repo.listar({ soloActivos: false })
  }
}

export class VerProducto {
  constructor(private repo: ProductoRepository) {}

  async ejecutar(id: number, { soloActivos }: { soloActivos: boolean }): Promise<Producto> {
    const p = await this.repo.porId(id, { soloActivos })
    if (!p) throw noEncontrado("Producto")
    return p
  }
}

async function validarCategoria(categorias: CategoriaRepository, categoriaId: number | null | undefined) {
  if (categoriaId && !(await categorias.porId(categoriaId))) throw invalido("Esa categoría no existe.")
}

export class CrearProducto {
  constructor(
    private repo: ProductoRepository,
    private categorias: CategoriaRepository,
  ) {}

  async ejecutar(datos: DatosProducto): Promise<number> {
    await validarCategoria(this.categorias, datos.categoriaId)
    return this.repo.crear(datos)
  }
}

/** Editar o dar de baja (activo: false). No hay borrar: los pedidos viejos lo siguen referenciando. */
export class ActualizarProducto {
  constructor(
    private repo: ProductoRepository,
    private categorias: CategoriaRepository,
  ) {}

  async ejecutar(id: number, cambios: CambiosProducto): Promise<void> {
    if (!Object.keys(cambios).length) throw invalido("No se envió ningún campo para modificar")
    await validarCategoria(this.categorias, cambios.categoriaId)
    if (!(await this.repo.actualizar(id, cambios))) throw noEncontrado("Producto")
  }
}

export class GestionarCategorias {
  constructor(private repo: CategoriaRepository) {}

  listar(soloActivas: boolean): Promise<Categoria[]> {
    return this.repo.listar({ soloActivas })
  }

  async crear(nombre: string, activo = true): Promise<Categoria> {
    const id = await this.repo.crear({ nombre, activo })
    return { id, nombre, activo }
  }

  async actualizar(id: number, cambios: Partial<{ nombre: string; activo: boolean }>): Promise<Categoria> {
    if (!(await this.repo.actualizar(id, cambios))) throw noEncontrado("Categoría")
    return (await this.repo.porId(id))!
  }
}
