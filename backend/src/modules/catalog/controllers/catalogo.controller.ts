/**
 * Controller del catálogo (la "C" de MVC): valida la entrada, llama al caso
 * de uso y devuelve el DTO. Sin reglas de negocio ni SQL.
 */
import type { Request, Response } from "express"
import { servicioNuevo, type CambiosServicio } from "../models/servicio.model.js"
import type { ActualizarProducto, CrearProducto, GestionarCategorias, ListarProductos, VerProducto } from "../services/productos.usecases.js"
import type { ActualizarServicio, CrearServicio, ListarServicios, VerServicio } from "../services/servicios.usecases.js"
import { aCategoriaPanel, aCategoriaPublica, aProductoPanel, aProductoPublico, aServicioPanel, aServicioPublico } from "../schemas/catalogo.dto.js"
import {
  cambiosCategoria,
  cambiosProducto,
  cambiosServicio,
  filtrosProductos,
  idParam,
  nuevaCategoria,
  nuevoProducto,
  nuevoServicio,
} from "../schemas/catalogo.schema.js"

export type CasosDeUsoCatalogo = {
  listarServicios: ListarServicios
  verServicio: VerServicio
  crearServicio: CrearServicio
  actualizarServicio: ActualizarServicio
  listarProductos: ListarProductos
  verProducto: VerProducto
  crearProducto: CrearProducto
  actualizarProducto: ActualizarProducto
  categorias: GestionarCategorias
}

/** Las claves del contrato (name, price…) → los campos del dominio. */
function aDominio(b: Partial<ReturnType<typeof cambiosServicio.parse>>): CambiosServicio {
  const d: CambiosServicio = {
    nombre: b.name,
    categoria: b.category,
    precio: b.price,
    duracionMin: b.durationMin,
    descripcionCorta: b.shortDescription,
    descripcion: b.description,
    imagenUrl: b.image,
    incluye: b.includes,
    profesional: b.professional,
    etiqueta: b.badge,
    sesionesRecomendadas: b.recommendedSessions,
    activo: b.activo,
  }
  return Object.fromEntries(Object.entries(d).filter(([, v]) => v !== undefined)) as CambiosServicio
}

export class CatalogoController {
  constructor(private casos: CasosDeUsoCatalogo) {}

  // ----- servicios: web
  serviciosPublicos = async (_req: Request, res: Response) => {
    res.json((await this.casos.listarServicios.publicos()).map(aServicioPublico))
  }
  servicioPublico = async (req: Request, res: Response) => {
    res.json(aServicioPublico(await this.casos.verServicio.publico(idParam.parse(req.params.id))))
  }

  // ----- servicios: panel
  serviciosPanel = async (_req: Request, res: Response) => {
    res.json((await this.casos.listarServicios.paraElPanel()).map(aServicioPanel))
  }
  servicioPanel = async (req: Request, res: Response) => {
    res.json(aServicioPanel(await this.casos.verServicio.paraElPanel(idParam.parse(req.params.id))))
  }
  crearServicio = async (req: Request, res: Response) => {
    const b = nuevoServicio.parse(req.body)
    const id = await this.casos.crearServicio.ejecutar(
      servicioNuevo({ ...aDominio(b), nombre: b.name, categoria: b.category, precio: b.price, duracionMin: b.durationMin }),
    )
    res.status(201).json(aServicioPanel(await this.casos.verServicio.paraElPanel(id)))
  }
  actualizarServicio = async (req: Request, res: Response) => {
    const id = idParam.parse(req.params.id)
    await this.casos.actualizarServicio.ejecutar(id, aDominio(cambiosServicio.parse(req.body)))
    res.json(aServicioPanel(await this.casos.verServicio.paraElPanel(id)))
  }

  // ----- tienda: web
  categoriasPublicas = async (_req: Request, res: Response) => {
    res.json((await this.casos.categorias.listar(true)).map(aCategoriaPublica))
  }
  productosPublicos = async (req: Request, res: Response) => {
    const { categoria, q } = filtrosProductos.parse(req.query)
    res.json((await this.casos.listarProductos.publicos({ categoriaId: categoria, texto: q })).map(aProductoPublico))
  }
  productoPublico = async (req: Request, res: Response) => {
    res.json(aProductoPublico(await this.casos.verProducto.ejecutar(idParam.parse(req.params.id), { soloActivos: true })))
  }

  // ----- tienda: panel
  categoriasPanel = async (_req: Request, res: Response) => {
    res.json((await this.casos.categorias.listar(false)).map(aCategoriaPanel))
  }
  crearCategoria = async (req: Request, res: Response) => {
    const { nombre, activo } = nuevaCategoria.parse(req.body)
    res.status(201).json(aCategoriaPanel(await this.casos.categorias.crear(nombre, activo)))
  }
  actualizarCategoria = async (req: Request, res: Response) => {
    res.json(aCategoriaPanel(await this.casos.categorias.actualizar(idParam.parse(req.params.id), cambiosCategoria.parse(req.body))))
  }
  productosPanel = async (_req: Request, res: Response) => {
    res.json((await this.casos.listarProductos.paraElPanel()).map(aProductoPanel))
  }
  productoPanel = async (req: Request, res: Response) => {
    res.json(aProductoPanel(await this.casos.verProducto.ejecutar(idParam.parse(req.params.id), { soloActivos: false })))
  }
  crearProducto = async (req: Request, res: Response) => {
    const id = await this.casos.crearProducto.ejecutar(nuevoProducto.parse(req.body))
    res.status(201).json(aProductoPanel(await this.casos.verProducto.ejecutar(id, { soloActivos: false })))
  }
  actualizarProducto = async (req: Request, res: Response) => {
    const id = idParam.parse(req.params.id)
    await this.casos.actualizarProducto.ejecutar(id, cambiosProducto.parse(req.body))
    res.json(aProductoPanel(await this.casos.verProducto.ejecutar(id, { soloActivos: false })))
  }
}
