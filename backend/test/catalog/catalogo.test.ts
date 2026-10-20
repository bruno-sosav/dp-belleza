/** Catálogo: reglas de dominio y casos de uso con repositorios en memoria (sin base de datos). */
import { beforeEach, describe, expect, it } from "vitest"
import { ErrorDeNegocio } from "../../src/core/errores.js"
import { ActualizarServicio, CrearServicio, ListarServicios, VerServicio } from "../../src/modules/catalog/application/servicios.js"
import { ActualizarProducto, CrearProducto, ListarProductos } from "../../src/modules/catalog/application/productos.js"
import { disponible } from "../../src/modules/catalog/domain/producto.js"
import type { CambiosProducto, Categoria, DatosProducto, Producto, ProductoVendible } from "../../src/modules/catalog/domain/producto.js"
import { elegirCategoria, limpiarCategoria, servicioNuevo } from "../../src/modules/catalog/domain/servicio.js"
import type { CambiosServicio, DatosServicio, Servicio } from "../../src/modules/catalog/domain/servicio.js"
import type { CategoriaRepository, ProductoRepository, ServicioRepository, TurnosDeServicios } from "../../src/modules/catalog/domain/ports.js"

class ServiciosEnMemoria implements ServicioRepository {
  filas = new Map<number, Servicio>()
  private siguiente = 1
  async listar({ incluirPausados }: { incluirPausados: boolean }) {
    return [...this.filas.values()].filter((s) => incluirPausados || s.activo)
  }
  async porId(id: number, { incluirPausados }: { incluirPausados: boolean }) {
    const s = this.filas.get(id)
    return s && (incluirPausados || s.activo) ? s : null
  }
  async crear(d: DatosServicio) {
    const id = this.siguiente++
    this.filas.set(id, { ...d, id })
    return id
  }
  async actualizar(id: number, c: CambiosServicio) {
    const s = this.filas.get(id)
    if (!s) return false
    this.filas.set(id, { ...s, ...c })
    return true
  }
  async categoriasEnUso(sinContar = 0) {
    return [...new Set([...this.filas.values()].filter((s) => s.id !== sinContar).map((s) => s.categoria))]
  }
}

const sinTurnos: TurnosDeServicios = { pedidosAFuturo: async () => new Map() }

class ProductosEnMemoria implements ProductoRepository {
  filas = new Map<number, Producto>()
  private siguiente = 1
  async listar({ soloActivos }: { soloActivos: boolean }) {
    return [...this.filas.values()].filter((p) => !soloActivos || p.activo)
  }
  async porId(id: number, { soloActivos }: { soloActivos: boolean }) {
    const p = this.filas.get(id)
    return p && (!soloActivos || p.activo) ? p : null
  }
  async crear(d: DatosProducto) {
    const id = this.siguiente++
    this.filas.set(id, { id, nombre: d.nombre, descripcion: d.descripcion ?? null, precio: d.precio, stock: d.stock, imagenUrl: null, activo: d.activo ?? true, categoria: null })
    return id
  }
  async actualizar(id: number, c: CambiosProducto) {
    const p = this.filas.get(id)
    if (!p) return false
    this.filas.set(id, { ...p, ...(c as Partial<Producto>) })
    return true
  }
  async vendibles(ids: number[]) {
    const r = new Map<number, ProductoVendible>()
    for (const id of ids) {
      const p = this.filas.get(id)
      if (p?.activo) r.set(id, { id, nombre: p.nombre, precio: p.precio })
    }
    return r
  }
}

const unaCategoria: CategoriaRepository = {
  listar: async () => [],
  porId: async (id) => (id === 1 ? ({ id: 1, nombre: "Cremas", activo: true } as Categoria) : null),
  crear: async () => 1,
  actualizar: async () => true,
}

const tipoDeError = async (p: Promise<unknown>) => {
  try {
    await p
    return null
  } catch (err) {
    return err instanceof ErrorDeNegocio ? err.tipo : "otro"
  }
}

const base = { nombre: "Masaje", categoria: "Masajes", precio: 20000, duracionMin: 60 }

describe("dominio del catálogo", () => {
  it("una categoría escrita distinta usa la que ya existe (mayúsculas, tildes, espacios)", () => {
    expect(elegirCategoria("  masajes ", ["Masajes", "Facial"])).toBe("Masajes")
    expect(elegirCategoria("depilacion", ["Depilación"])).toBe("Depilación")
    expect(elegirCategoria("Cosmetología  Nueva", ["Masajes"])).toBe("Cosmetología Nueva")
    expect(limpiarCategoria("  a   b ")).toBe("a b")
  })

  it("un servicio nuevo arranca visible y con lo opcional vacío", () => {
    expect(servicioNuevo(base)).toMatchObject({ activo: true, incluye: [], etiqueta: null, profesional: null })
  })

  it("la tienda solo sabe si hay stock, no cuánto", () => {
    expect(disponible({ stock: 3 })).toBe(true)
    expect(disponible({ stock: 0 })).toBe(false)
  })
})

describe("servicios", () => {
  let repo: ServiciosEnMemoria
  beforeEach(() => {
    repo = new ServiciosEnMemoria()
  })

  it("al crear, unifica la categoría con una que ya existe", async () => {
    await new CrearServicio(repo).ejecutar(servicioNuevo(base))
    const id = await new CrearServicio(repo).ejecutar(servicioNuevo({ ...base, nombre: "Otro", categoria: "MASAJES" }))
    expect(repo.filas.get(id)?.categoria).toBe("Masajes")
  })

  it("pausado: la web no lo ve ni lo puede reservar; el panel sí, y la agenda puede reprogramar con él", async () => {
    const id = await new CrearServicio(repo).ejecutar(servicioNuevo(base))
    await new ActualizarServicio(repo).ejecutar(id, { activo: false })
    const ver = new VerServicio(repo, sinTurnos)
    expect(await new ListarServicios(repo, sinTurnos).publicos()).toEqual([])
    expect(await tipoDeError(ver.publico(id))).toBe("no_encontrado")
    expect(await tipoDeError(ver.reservable(id))).toBe("no_encontrado")
    expect(await ver.reservable(id, { incluirPausados: true })).toEqual({ id, nombre: "Masaje", precio: 20000, duracionMin: 60 })
    expect((await new ListarServicios(repo, sinTurnos).paraElPanel())[0]).toMatchObject({ id, activo: false, turnosProximos: 0 })
  })

  it("valida duración y precio, y editar uno que no existe es 'no encontrado'", async () => {
    expect(await tipoDeError(new CrearServicio(repo).ejecutar(servicioNuevo({ ...base, duracionMin: 2 })))).toBe("invalido")
    expect(await tipoDeError(new ActualizarServicio(repo).ejecutar(99, { precio: 1 }))).toBe("no_encontrado")
  })
})

describe("productos", () => {
  it("no deja usar una categoría que no existe", async () => {
    const crear = new CrearProducto(new ProductosEnMemoria(), unaCategoria)
    expect(await tipoDeError(crear.ejecutar({ nombre: "Crema", precio: 100, stock: 1, categoriaId: 99 }))).toBe("invalido")
    expect(await crear.ejecutar({ nombre: "Crema", precio: 100, stock: 1, categoriaId: 1 })).toBe(1)
  })

  it("dado de baja no aparece en la tienda; editar sin cambios es inválido", async () => {
    const repo = new ProductosEnMemoria()
    const id = await new CrearProducto(repo, unaCategoria).ejecutar({ nombre: "Crema", precio: 100, stock: 1 })
    const actualizar = new ActualizarProducto(repo, unaCategoria)
    await actualizar.ejecutar(id, { activo: false })
    expect(await new ListarProductos(repo).publicos({})).toEqual([])
    expect(await tipoDeError(actualizar.ejecutar(id, {}))).toBe("invalido")
  })
})
