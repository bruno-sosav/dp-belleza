/** Web: /api/turnos/servicios… y /api/tienda/… · Panel: /api/admin (con sesión). */
import { Router } from "express"
import type { CatalogoController } from "./catalogo.controller.js"

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
