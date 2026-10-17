import type { PoolConnection, ResultSetHeader } from "mysql2/promise"
import { HttpError } from "../errors.js"
import { normalizarTelefono } from "./telefono.js"

export type DatosCliente = {
  nombre: string
  apellido?: string
  telefono: string
  email?: string
}

// Dado un teléfono, devuelve el id del cliente: si ya existe lo reutiliza, si no, lo crea. La usan
// la tienda y la turnera, así la misma persona no queda duplicada.
//
// Si ya existe, NO se pisan sus datos: solo se completan los que estén vacíos. Antes se
// reemplazaba el nombre con lo que escribiera la persona en cada reserva o compra, y eso borraba
// lo que la dueña corrige a mano en la ficha (por ejemplo, "Sofi" -> "Sofía Martínez"). El
// teléfono es lo que la identifica; el nombre es de la ficha.
//
// Va dentro de una transacción: recibe la conexión de quien la llama.
export async function buscarOCrearCliente(conn: PoolConnection, datos: DatosCliente): Promise<number> {
  const telefono = normalizarTelefono(datos.telefono)
  if (!telefono) throw new HttpError(400, "El teléfono no es válido")

  const [r] = await conn.query<ResultSetHeader>(
    `INSERT INTO clientes (nombre, apellido, telefono, email) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id),
       apellido = COALESCE(apellido, VALUES(apellido)), email = COALESCE(email, VALUES(email))`,
    [datos.nombre, datos.apellido ?? null, telefono, datos.email ?? null],
  )
  return r.insertId
}
