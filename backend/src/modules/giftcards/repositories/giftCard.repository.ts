/** `gift_cards` y `gift_card_movimientos` en MySQL: el ÚNICO lugar que escribe esas tablas. */
import type { ResultSetHeader, RowDataPacket } from "mysql2"
import { ejecutor } from "../../../core/database/unidadDeTrabajo.database.js"
import type { Transaccion } from "../../../core/transaccion.port.js"
import type { GiftCard, Movimiento } from "../models/giftCard.model.js"
import type { FiltrosGiftCards, GiftCardRepository, NuevaGiftCard, NuevoMovimiento } from "../models/giftCards.ports.js"

const fecha = (v: unknown) => (v ? String(v).slice(0, 16) : null)

const aGiftCard = (r: RowDataPacket): GiftCard => ({
  id: r.id,
  codigo: r.codigo,
  monto: Number(r.monto),
  saldo: Number(r.saldo),
  estado: r.estado,
  origen: r.origen,
  comprador: { nombre: r.comprador_nombre, telefono: r.comprador_telefono ?? null, email: r.comprador_email ?? null },
  para: r.para_nombre ?? null,
  mensaje: r.mensaje ?? null,
  activadaAt: fecha(r.activada_at),
  creadaEn: fecha(r.created_at)!,
})

const aMovimiento = (r: RowDataPacket): Movimiento => ({
  id: r.id,
  fechaHora: fecha(r.fecha_hora)!,
  tipo: r.tipo,
  monto: Number(r.monto),
  saldoDespues: Number(r.saldo_despues),
  pedidoId: r.pedido_id ?? null,
  descripcion: r.descripcion ?? null,
})

export class MySqlGiftCardRepository implements GiftCardRepository {
  async crear(g: NuevaGiftCard, tx?: Transaccion) {
    // El saldo arranca en 0: se carga al activarla (al pagarla o al venderla en el local).
    const [r] = await ejecutor(tx).query<ResultSetHeader>(
      `INSERT INTO gift_cards (codigo, monto, saldo, estado, origen, comprador_nombre, comprador_telefono, comprador_email, para_nombre, mensaje, pago_token)
       VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [g.codigo, g.monto, g.estado, g.origen, g.comprador.nombre, g.comprador.telefono, g.comprador.email, g.para, g.mensaje, g.pagoToken],
    )
    return r.insertId
  }

  async porId(id: number, tx?: Transaccion) {
    const [rows] = await ejecutor(tx).query<RowDataPacket[]>(`SELECT * FROM gift_cards WHERE id = ? ${tx ? "FOR UPDATE" : ""}`, [id])
    return rows[0] ? aGiftCard(rows[0]) : null
  }

  async porCodigo(codigo: string, tx?: Transaccion) {
    const [rows] = await ejecutor(tx).query<RowDataPacket[]>(`SELECT * FROM gift_cards WHERE codigo = ? ${tx ? "FOR UPDATE" : ""}`, [codigo])
    return rows[0] ? aGiftCard(rows[0]) : null
  }

  async idPorToken(token: string) {
    const [rows] = await ejecutor().query<RowDataPacket[]>("SELECT id FROM gift_cards WHERE pago_token = ?", [token])
    return (rows[0]?.id as number | undefined) ?? null
  }

  async activar(id: number, pagoId: number | null, tx: Transaccion) {
    await ejecutor(tx).query("UPDATE gift_cards SET estado = 'activa', saldo = monto, pago_id = ?, activada_at = NOW() WHERE id = ?", [pagoId, id])
  }

  async cambiarSaldo(id: number, saldo: number, tx: Transaccion) {
    await ejecutor(tx).query("UPDATE gift_cards SET saldo = ? WHERE id = ?", [saldo, id])
  }

  async anular(id: number, tx: Transaccion) {
    await ejecutor(tx).query("UPDATE gift_cards SET estado = 'anulada', saldo = 0 WHERE id = ?", [id])
  }

  async movimiento(m: NuevoMovimiento, tx: Transaccion) {
    await ejecutor(tx).query(
      "INSERT INTO gift_card_movimientos (gift_card_id, tipo, monto, saldo_despues, pedido_id, descripcion) VALUES (?, ?, ?, ?, ?, ?)",
      [m.giftCardId, m.tipo, m.monto, m.saldoDespues, m.pedidoId ?? null, m.descripcion ?? null],
    )
  }

  async movimientos(id: number) {
    const [rows] = await ejecutor().query<RowDataPacket[]>("SELECT * FROM gift_card_movimientos WHERE gift_card_id = ? ORDER BY fecha_hora, id", [id])
    return rows.map(aMovimiento)
  }

  /** Las últimas 300; la búsqueda por código, comprador o destinataria. */
  async listar(f: FiltrosGiftCards) {
    const donde: string[] = []
    const valores: unknown[] = []
    if (f.estado) {
      donde.push("estado = ?")
      valores.push(f.estado)
    }
    if (f.busqueda) {
      const termino = `%${f.busqueda}%`
      donde.push("(codigo LIKE ? OR comprador_nombre LIKE ? OR para_nombre LIKE ? OR comprador_telefono LIKE ?)")
      valores.push(`%${f.busqueda.toUpperCase().replace(/[^A-Z0-9]/g, "")}%`, termino, termino, termino)
    }
    const [rows] = await ejecutor().query<RowDataPacket[]>(
      `SELECT * FROM gift_cards ${donde.length ? `WHERE ${donde.join(" AND ")}` : ""} ORDER BY created_at DESC, id DESC LIMIT 300`,
      valores,
    )
    return rows.map(aGiftCard)
  }
}
