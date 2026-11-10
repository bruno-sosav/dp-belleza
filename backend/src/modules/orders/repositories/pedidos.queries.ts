/** Vistas de lectura de pedidos para el panel. Hacen JOIN con `clientes` y `productos`, nunca los escriben. */
import type { RowDataPacket } from "mysql2"
import { pool } from "../../../core/database/conexion.database.js"
import type { PedidosQueries } from "../models/pedidos.ports.js"
import type { EnvioDelPedido, EstadoPedido, FiltrosPedidos, PagoEstado, PedidoResumen } from "../models/pedido.model.js"

const COLUMNAS = `p.id, p.estado, p.pago_estado, p.total, p.descuento_cumple, p.notas, p.created_at, p.updated_at, p.gift_card_monto, g.codigo AS gift_card_codigo,
  c.id AS cliente_id, c.nombre, c.apellido, c.telefono, c.email,
  e.pedido_id AS envio_pedido, e.estado AS envio_estado`

/** Vista de lectura: el envío es de shipping y la gift card de giftcards; acá solo se leen. */
const DESDE = `FROM pedidos p JOIN clientes c ON c.id = p.cliente_id LEFT JOIN envios e ON e.pedido_id = p.id LEFT JOIN gift_cards g ON g.id = p.gift_card_id`

function aEnvio(r: RowDataPacket): EnvioDelPedido {
  return {
    calle: r.calle,
    ciudad: r.ciudad,
    provincia: r.provincia,
    codigoPostal: r.codigo_postal,
    costo: Number(r.costo),
    plazoDias: r.plazo_dias ?? null,
    proveedor: r.proveedor,
    estado: r.estado,
    numeroSeguimiento: r.numero_seguimiento ?? null,
    despachadoAt: r.despachado_at ? String(r.despachado_at).slice(0, 16) : null,
  }
}

/** "AB3KXY7Q" → "AB3K-XY7Q", como lo ve la dueña. */
const aCodigo = (c: string) => `${c.slice(0, 4)}-${c.slice(4)}`

function aResumen(r: RowDataPacket): PedidoResumen {
  return {
    id: r.id as number,
    estado: r.estado as EstadoPedido,
    pagoEstado: (r.pago_estado as PagoEstado) ?? null,
    total: Number(r.total),
    notas: r.notas as string | null,
    unidades: Number(r.unidades ?? 0),
    entrega: r.envio_pedido ? "envio" : "retiro",
    envioEstado: r.envio_estado ?? null,
    cliente: { id: r.cliente_id, nombre: r.nombre, apellido: r.apellido, telefono: r.telefono, email: r.email },
    creadoEn: r.created_at as string,
    actualizadoEn: r.updated_at as string,
  }
}

export class MySqlPedidosQueries implements PedidosQueries {
  async listar({ estado, desde, hasta }: FiltrosPedidos) {
    const condiciones: string[] = []
    const params: unknown[] = []
    if (estado) {
      condiciones.push("p.estado = ?")
      params.push(estado)
    }
    if (desde) {
      condiciones.push("p.created_at >= ?")
      params.push(desde)
    }
    if (hasta) {
      condiciones.push("p.created_at < DATE_ADD(?, INTERVAL 1 DAY)")
      params.push(hasta)
    }
    const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : ""
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT ${COLUMNAS},
              (SELECT COALESCE(SUM(cantidad), 0) FROM pedido_items WHERE pedido_id = p.id) AS unidades
       ${DESDE}
       ${where}
       ORDER BY p.created_at DESC
       LIMIT 500`,
      params,
    )
    return rows.map(aResumen)
  }

  async detalle(id: number) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT ${COLUMNAS} ${DESDE} WHERE p.id = ?`,
      [id],
    )
    if (!rows[0]) return null
    const [items] = await pool.query<RowDataPacket[]>(
      `SELECT i.producto_id, pr.nombre, i.cantidad, i.precio_unitario
       FROM pedido_items i JOIN productos pr ON pr.id = i.producto_id
       WHERE i.pedido_id = ? ORDER BY i.id`,
      [id],
    )
    const [envios] = await pool.query<RowDataPacket[]>("SELECT * FROM envios WHERE pedido_id = ?", [id])
    const { unidades: _, envioEstado: __, ...pedido } = aResumen(rows[0])
    return {
      ...pedido,
      envio: envios[0] ? aEnvio(envios[0]) : null,
      descuentoCumple: Number(rows[0].descuento_cumple ?? 0),
      giftCard: rows[0].gift_card_codigo ? { codigo: aCodigo(rows[0].gift_card_codigo), monto: Number(rows[0].gift_card_monto) } : null,
      items: items.map((i) => ({
        productoId: i.producto_id as number,
        nombre: i.nombre as string,
        cantidad: Number(i.cantidad),
        precioUnitario: Number(i.precio_unitario),
      })),
    }
  }
}
