import type { ResultSetHeader, RowDataPacket } from "mysql2"
import { enTransaccion } from "../core/database/conexion.js"
import { HttpError } from "../core/errores.js"
import { clientes } from "../modules/customers/customers.module.js"
import { comoTransaccion } from "../core/database/MySqlUnidadDeTrabajo.js"
import { agruparItems, redondear } from "../shared/models/pedidos.js"
import type { NuevoPedido } from "./validacion.js"

// Checkout: crea el pedido, toma los precios de la base y descuenta stock, todo en una transacción.
export async function crearPedido(datos: NuevoPedido) {
  const items = agruparItems(datos.items)

  return enTransaccion(async (conn) => {
    const clienteId = await clientes.buscarOCrear(datos.cliente, comoTransaccion(conn))

    // FOR UPDATE bloquea las filas hasta el commit, así dos compras simultáneas no venden el mismo stock.
    const ids = items.map((i) => i.productoId)
    const [productos] = await conn.query<RowDataPacket[]>(
      "SELECT id, nombre, precio, stock, activo FROM productos WHERE id IN (?) FOR UPDATE",
      [ids],
    )
    const porId = new Map(productos.map((p) => [p.id as number, p]))

    const problemas: { productoId: number; motivo: string }[] = []
    for (const item of items) {
      const p = porId.get(item.productoId)
      if (!p || !p.activo) problemas.push({ productoId: item.productoId, motivo: "no disponible" })
      else if (p.stock < item.cantidad)
        problemas.push({ productoId: item.productoId, motivo: `stock insuficiente (quedan ${p.stock})` })
    }
    if (problemas.length) throw new HttpError(409, "Algunos productos no se pueden comprar", problemas)

    // El precio sale siempre de la base, nunca del navegador.
    const lineas = items.map((item) => {
      const p = porId.get(item.productoId)!
      return { ...item, nombre: p.nombre as string, precioUnitario: p.precio as number }
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
    for (const l of lineas) {
      await conn.query("UPDATE productos SET stock = stock - ? WHERE id = ?", [l.cantidad, l.productoId])
    }

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
