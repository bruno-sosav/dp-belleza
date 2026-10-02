import { Router } from "express"
import type { ResultSetHeader, RowDataPacket } from "mysql2"
import { z } from "zod"
import { enTransaccion } from "../db.js"
import { HttpError } from "../errors.js"
import { normalizarTelefono } from "../lib/telefono.js"
import { agruparItems, redondear } from "../lib/pedidos.js"

// Checkout público: el cliente no tiene cuenta, se identifica por teléfono.
export const pedidos = Router()

const nuevoPedido = z.object({
  cliente: z.object({
    nombre: z.string().trim().min(1).max(100),
    apellido: z.string().trim().max(100).optional(),
    telefono: z.string().trim().min(6).max(30),
    email: z.email().max(150).optional(),
  }),
  items: z
    .array(
      z.object({
        productoId: z.number().int().positive(),
        cantidad: z.number().int().positive().max(100),
      }),
    )
    .min(1, "El pedido no tiene productos")
    .max(50),
  notas: z.string().trim().max(1000).optional(),
})

pedidos.post("/pedidos", async (req, res) => {
  const datos = nuevoPedido.parse(req.body)
  const telefono = normalizarTelefono(datos.cliente.telefono)
  if (!telefono) throw new HttpError(400, "El teléfono no es válido")
  const items = agruparItems(datos.items)

  const pedido = await enTransaccion(async (conn) => {
    // Si el teléfono ya existe se reutiliza el cliente (y se actualizan sus datos).
    const [cliente] = await conn.query<ResultSetHeader>(
      `INSERT INTO clientes (nombre, apellido, telefono, email) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), nombre = VALUES(nombre),
         apellido = COALESCE(VALUES(apellido), apellido), email = COALESCE(VALUES(email), email)`,
      [datos.cliente.nombre, datos.cliente.apellido ?? null, telefono, datos.cliente.email ?? null],
    )
    const clienteId = cliente.insertId

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
      const precioUnitario = porId.get(item.productoId)!.precio as number
      return { ...item, nombre: porId.get(item.productoId)!.nombre as string, precioUnitario }
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

  res.status(201).json(pedido)
})
