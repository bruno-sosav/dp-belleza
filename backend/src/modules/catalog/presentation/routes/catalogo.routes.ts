/**
 * Rutas del catálogo. Mismas URLs de antes de la reorganización:
 *   - servicios para la web, bajo /api/turnos   (/servicios, /servicios/:id)
 *   - tienda para la web, bajo /api/tienda      (/categorias, /productos…)
 *   - panel, bajo /api/admin (exige sesión)
 */
import { Router } from "express"
import type { CatalogoController } from "../controllers/catalogo.controller.js"

export function rutasServiciosWeb(c: CatalogoController): Router {
  const r = Router()
  r.get("/servicios", c.serviciosPublicos)
  r.get("/servicios/:id", c.servicioPublico)
  return r
}

export function rutasTiendaWeb(c: CatalogoController): Router {
  const r = Router()
  r.get("/categorias", c.categoriasPublicas)
  r.get("/productos", c.productosPublicos)
  r.get("/productos/:id", c.productoPublico)
  return r
}

export function rutasPanelCatalogo(c: CatalogoController): Router {
  const r = Router()
  r.get("/servicios", c.serviciosPanel)
  r.post("/servicios", c.crearServicio)
  r.get("/servicios/:id", c.servicioPanel)
  r.patch("/servicios/:id", c.actualizarServicio)
  r.get("/categorias", c.categoriasPanel)
  r.post("/categorias", c.crearCategoria)
  r.patch("/categorias/:id", c.actualizarCategoria)
  r.get("/productos", c.productosPanel)
  r.post("/productos", c.crearProducto)
  r.get("/productos/:id", c.productoPanel)
  r.patch("/productos/:id", c.actualizarProducto)
  return r
}
