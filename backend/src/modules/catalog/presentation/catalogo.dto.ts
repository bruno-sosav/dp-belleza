/**
 * Lo que SALE por HTTP del catálogo.
 *
 * Servicios: claves en inglés porque es el contrato que ya usan la web y el
 * panel (el tipo `Service` de frontend/shared/data/services.ts).
 * Productos: la tienda pública no ve el stock exacto ni si está dado de baja;
 * ve si hay o no (`disponible`). El panel ve todo.
 */
import type { Categoria, Producto } from "../domain/producto.js"
import { disponible } from "../domain/producto.js"
import type { Servicio } from "../domain/servicio.js"
import type { ServicioConTurnos } from "../application/servicios.js"

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
