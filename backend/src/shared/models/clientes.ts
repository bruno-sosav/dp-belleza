import type { PoolConnection, ResultSetHeader } from "mysql2/promise"
import { HttpError } from "../errors.js"
import { normalizarTelefono } from "./telefono.js"

export type DatosCliente = {
  nombre: string
  apellido?: string
  telefono: string
  email?: string
}

// Dado un teléfono, devuelve el id del cliente: si ya existe lo reutiliza (y actualiza sus datos),
// si no, lo crea. La usan la tienda y la turnera, así la misma persona no queda duplicada.
// Va dentro de una transacción: recibe la conexión de quien la llama.
export async function buscarOCrearCliente(conn: PoolConnection, datos: DatosCliente): Promise<number> {
  const telefono = normalizarTelefono(datos.telefono)
  if (!telefono) throw new HttpError(400, "El teléfono no es válido")

  const [r] = await conn.query<ResultSetHeader>(
    `INSERT INTO clientes (nombre, apellido, telefono, email) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), nombre = VALUES(nombre),
       apellido = COALESCE(VALUES(apellido), apellido), email = COALESCE(VALUES(email), email)`,
    [datos.nombre, datos.apellido ?? null, telefono, datos.email ?? null],
  )
  return r.insertId
}
