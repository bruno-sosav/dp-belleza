import type { ResultSetHeader } from "mysql2"
import { enTransaccion } from "../core/database/conexion.database.js"
import { ErrorDeNegocio } from "../core/negocio.error.js"
import { catalogo } from "../modules/catalog/catalog.module.js"
import { inventario } from "../modules/inventory/inventory.module.js"
import { clientes } from "../modules/customers/customers.module.js"
import { comoTransaccion } from "../core/database/unidadDeTrabajo.database.js"
import { agruparItems, redondear } from "../shared/models/pedidos.js"
import type { NuevoPedido } from "./validacion.js"

// Checkout: crea el pedido con los precios del catálogo y el stock del
// inventario, todo en una transacción.
export async function crearPedido(datos: NuevoPedido) {
  const items = agruparItems(datos.items)

  return enTransaccion(async (conn) => {
    const clienteId = await clientes.buscarOCrear(datos.cliente, comoTransaccion(conn))

    const tx = comoTransaccion(conn)

    // Del catálogo: qué productos están activos y a qué precio. El precio sale
    // siempre de la base, nunca del navegador.
    const vendibles = await catalogo.productosParaVender(items.map((i) => i.productoId), tx)
    const problemas = items.filter((i) => !vendibles.has(i.productoId)).map((i) => ({ productoId: i.productoId, motivo: "no disponible" }))

    // Del inventario: que alcance el stock, y descontarlo. Bloquea esas filas
    // hasta el commit, así dos compras simultáneas no venden la misma unidad.
    const reserva = await inventario.reservar(items.filter((i) => vendibles.has(i.productoId)), tx)
    if (!reserva.ok) problemas.push(...reserva.problemas)
    // Si algo falla, la transacción se deshace entera (también el descuento).
    if (problemas.length) throw new ErrorDeNegocio("conflicto", "Algunos productos no se pueden comprar", problemas)

    const lineas = items.map((item) => {
      const p = vendibles.get(item.productoId)!
      return { ...item, nombre: p.nombre, precioUnitario: p.precio }
    })
    const total = redondear(lineas.reduce((suma, l) => suma + l.precioUnitario * l.cantidad, 0))

    const [insertado] = await conn.query<ResultSetHeader>(
      "INSERT INTO pedidos (cliente_id, total, notas) VALUES (?, ?, ?)",
      [clienteId, total, datos.notas ?? null],
    )
    const pedidoId = insertado.insertId

    await conn.query(
      "INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES ?",
      [lineas.map((l) => [pedidoId, l.productoId, l.cantidad, l.precioUnitario])],
    )

    return {
      id: pedidoId,
      estado: "pendiente",
      total,
      items: lineas.map((l) => ({
        productoId: l.productoId,
        nombre: l.nombre,
        cantidad: l.cantidad,
        precioUnitario: l.precioUnitario,
        subtotal: redondear(l.precioUnitario * l.cantidad),
      })),
    }
  })
}
