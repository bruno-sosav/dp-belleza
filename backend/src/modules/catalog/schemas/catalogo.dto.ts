/**
 * Servicios con claves en inglés (contrato `Service` de frontend/shared/types/servicio.types.ts).
 * Productos: la tienda solo ve `disponible`, no el stock; el panel ve todo.
 */
import type { Categoria, Producto } from "../models/producto.model.js"
import { disponible } from "../models/producto.model.js"
import type { Servicio } from "../models/servicio.model.js"
import type { ServicioConTurnos } from "../services/servicios.usecases.js"

/** Un servicio en la web (catálogo, detalle y reserva). Los opcionales solo si tienen valor. */
export function aServicioPublico(s: Servicio) {
  return {
    id: s.id,
    name: s.nombre,
    category: s.categoria,
    price: s.precio,
    durationMin: s.duracionMin,
    image: s.imagenUrl,
    shortDescription: s.descripcionCorta,
    description: s.descripcion,
    includes: s.incluye,
    ...(s.profesional ? { professional: s.profesional } : {}),
    ...(s.etiqueta ? { badge: s.etiqueta } : {}),
    ...(s.sesionesRecomendadas ? { recommendedSessions: s.sesionesRecomendadas } : {}),
  }
}

/** Un servicio en el panel: lo mismo, más si está pausado y cuántos turnos pedidos tiene. */
export function aServicioPanel(s: ServicioConTurnos) {
  return { ...aServicioPublico(s), activo: s.activo, turnosProximos: s.turnosProximos }
}

/** Un producto en la tienda: sin stock exacto, sin `activo` (todos lo están). */
export function aProductoPublico(p: Producto) {
  return {
    id: p.id,
    nombre: p.nombre,
    descripcion: p.descripcion,
    precio: p.precio,
    imagenUrl: p.imagenUrl,
    categoria: p.categoria,
    disponible: disponible(p),
  }
}

export function aProductoPanel(p: Producto) {
  return {
    id: p.id,
    nombre: p.nombre,
    descripcion: p.descripcion,
    precio: p.precio,
    stock: p.stock,
    imagenUrl: p.imagenUrl,
    activo: p.activo,
    categoria: p.categoria,
  }
}

export const aCategoriaPublica = (c: Categoria) => ({ id: c.id, nombre: c.nombre })
export const aCategoriaPanel = (c: Categoria) => ({ id: c.id, nombre: c.nombre, activo: c.activo })
