/** Único lugar con SQL sobre `clientes`. */
import type { ResultSetHeader, RowDataPacket } from "mysql2"
import { conflicto } from "../../../core/negocio.error.js"
import type { Transaccion } from "../../../core/transaccion.port.js"
import { ejecutor } from "../../../core/database/unidadDeTrabajo.database.js"
import type { CambiosCliente, Cliente, DatosCliente } from "../models/cliente.model.js"
import type { ClienteRepository } from "../models/clientes.ports.js"

const COLUMNAS = "id, nombre, apellido, dni, telefono, email, cumple_dia, cumple_mes, notas, created_at"

function aCliente(r: RowDataPacket): Cliente {
  return {
    id: r.id,
    nombre: r.nombre,
    apellido: r.apellido,
    dni: r.dni,
    telefono: r.telefono,
    email: r.email,
    cumple: r.cumple_dia ? { dia: r.cumple_dia, mes: r.cumple_mes } : null,
    notas: r.notas,
    clienteDesde: String(r.created_at).slice(0, 10),
  }
}

/** Datos del dominio → columnas de la tabla. Solo las que vienen. */
function aColumnas(d: CambiosCliente): Record<string, unknown> {
  const c: Record<string, unknown> = {}
  if (d.nombre !== undefined) c.nombre = d.nombre
  if (d.apellido !== undefined) c.apellido = d.apellido || null
  if (d.dni !== undefined) c.dni = d.dni || null
  if (d.telefono !== undefined) c.telefono = d.telefono
  if (d.email !== undefined) c.email = d.email || null
  if (d.notas !== undefined) c.notas = d.notas || null
  if (d.cumple !== undefined) {
    c.cumple_dia = d.cumple?.dia ?? null
    c.cumple_mes = d.cumple?.mes ?? null
  }
  return c
}

/** El choque con uq_clientes_telefono o uq_clientes_dni, en palabras de la dueña. */
async function escribir<T>(accion: () => Promise<T>): Promise<T> {
  try {
    return await accion()
  } catch (err) {
    const e = err as { code?: string; message?: string }
    if (e.code === "ER_DUP_ENTRY") throw conflicto(e.message?.includes("uq_clientes_dni") ? "Ese DNI ya lo tiene otra clienta." : "Ese teléfono ya lo tiene otra clienta.")
    throw err
  }
}

export class MySqlClienteRepository implements ClienteRepository {
  async porId(id: number, tx?: Transaccion, { bloquear = false } = {}) {
    const [rows] = await ejecutor(tx).query<RowDataPacket[]>(
      `SELECT ${COLUMNAS} FROM clientes WHERE id = ? ${bloquear ? "FOR UPDATE" : ""}`,
      [id],
    )
    return rows[0] ? aCliente(rows[0]) : null
  }

  async porTelefono(telefono: string, tx?: Transaccion, { bloquear = false } = {}) {
    const [rows] = await ejecutor(tx).query<RowDataPacket[]>(
      `SELECT ${COLUMNAS} FROM clientes WHERE telefono = ? ${bloquear ? "FOR UPDATE" : ""}`,
      [telefono],
    )
    return rows[0] ? aCliente(rows[0]) : null
  }

  async porDni(dni: string, tx?: Transaccion, { bloquear = false } = {}) {
    const [rows] = await ejecutor(tx).query<RowDataPacket[]>(
      `SELECT ${COLUMNAS} FROM clientes WHERE dni = ? ${bloquear ? "FOR UPDATE" : ""}`,
      [dni],
    )
    return rows[0] ? aCliente(rows[0]) : null
  }

  async buscar(texto?: string) {
    const condiciones: string[] = []
    const params: unknown[] = []
    // Cada palabra tiene que aparecer en algún campo: "ana pe" encuentra "Ana Pérez".
    // El teléfono y el DNI se comparan solo por dígitos: "223 555" encuentra "5492235550001".
    for (const palabra of texto?.trim().split(/\s+/).filter(Boolean) ?? []) {
      const campos = ["nombre LIKE ?", "apellido LIKE ?"]
      params.push(`%${palabra}%`, `%${palabra}%`)
      const digitos = palabra.replace(/\D/g, "")
      if (digitos.length >= 3) {
        campos.push("telefono LIKE ?", "dni LIKE ?")
        params.push(`%${digitos}%`, `%${digitos}%`)
      }
      condiciones.push(`(${campos.join(" OR ")})`)
    }
    const [rows] = await ejecutor().query<RowDataPacket[]>(
      `SELECT ${COLUMNAS} FROM clientes ${condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : ""}
        ORDER BY nombre, apellido LIMIT 500`,
      params,
    )
    return rows.map(aCliente)
  }

  async crear(datos: DatosCliente, tx?: Transaccion) {
    const [r] = await escribir(() => ejecutor(tx).query<ResultSetHeader>("INSERT INTO clientes SET ?", [aColumnas(datos)]))
    return r.insertId
  }

  async actualizar(id: number, cambios: CambiosCliente, tx?: Transaccion) {
    const columnas = aColumnas(cambios)
    if (!Object.keys(columnas).length) return (await this.porId(id, tx)) !== null
    const [r] = await escribir(() => ejecutor(tx).query<ResultSetHeader>("UPDATE clientes SET ? WHERE id = ?", [columnas, id]))
    return r.affectedRows > 0
  }

  async eliminar(id: number, tx?: Transaccion) {
    await ejecutor(tx).query("DELETE FROM clientes WHERE id = ?", [id])
  }

  async parecidas(c: Cliente) {
    const [rows] = await ejecutor().query<RowDataPacket[]>(
      `SELECT ${COLUMNAS} FROM clientes
        WHERE id <> ?
          AND ((nombre = ? AND COALESCE(apellido, '') = COALESCE(?, '') AND ? IS NOT NULL)
               OR (email IS NOT NULL AND email = ?))
        LIMIT 10`,
      [c.id, c.nombre, c.apellido, c.apellido, c.email],
    )
    return rows.map(aCliente)
  }
}
