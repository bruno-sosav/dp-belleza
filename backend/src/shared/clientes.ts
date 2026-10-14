/**
 * Clientes — COMPARTIDO entre turnera y ecommerce.
 *
 * Un cliente es la misma persona en los dos lados del sistema: `turnos.cliente_id`
 * y `pedidos.cliente_id` apuntan a esta misma tabla, y se identifica por teléfono
 * (`uq_clientes_telefono`). Si alguien reservó un turno y después compra un
 * producto, el checkout tiene que ENCONTRAR ese cliente, no crear otro.
 *
 * Por eso esta función se escribe UNA vez acá y la llaman los dos módulos.
 * Si cada equipo escribiera la suya:
 *
 *   - una haría INSERT directo y reventaría contra el UNIQUE, o
 *   - cada una normalizaría el teléfono distinto, la base guardaría dos clientes,
 *     ninguna constraint se quejaría, y la dueña terminaría con la misma persona
 *     duplicada: los turnos en un registro y las compras en el otro.
 *
 * El segundo caso es el peligroso porque no falla: solo corrompe los datos.
 */
import type { PoolConnection } from "mysql2/promise"
import type { RowDataPacket } from "mysql2"
import { badRequest } from "./errors.ts"

export type ContactoCliente = {
  nombre: string
  apellido?: string | null
  telefono: string
  email?: string | null
  notas?: string | null
}

/**
 * Lleva un teléfono argentino a la forma canónica `549` + 10 dígitos,
 * que es la que usa WhatsApp y la que pide el comentario de la tabla.
 *
 *   "0223 15 123-4567"   -> "5492231234567"
 *   "+54 9 223 123 4567" -> "5492231234567"
 *   "2231234567"         -> "5492231234567"
 *
 * Lo que importa de esta función no es que cubra todos los formatos del país:
 * es que turnera y ecommerce usen EXACTAMENTE la misma. Dos implementaciones
 * distintas generan clientes duplicados sin que nada falle.
 */
export function normalizarTelefono(input: string): string {
  let digitos = input.replace(/\D/g, "")

  // Prefijo internacional marcado como 00.
  if (digitos.startsWith("00")) digitos = digitos.slice(2)

  // Código de país, con o sin el 9 de celular.
  if (digitos.startsWith("549")) digitos = digitos.slice(3)
  else if (digitos.startsWith("54")) digitos = digitos.slice(2)

  // Prefijo de larga distancia nacional.
  if (digitos.startsWith("0")) digitos = digitos.replace(/^0+/, "")

  // El "15" del formato local va DESPUÉS de la característica (0223-15-1234567)
  // y la característica mide entre 2 y 4 dígitos, así que no está en una
  // posición fija: se saca el primer "15" que deje un número de 10 dígitos.
  if (digitos.length > 10) {
    for (let i = 0; i <= digitos.length - 2; i++) {
      if (digitos.slice(i, i + 2) === "15") {
        const sinQuince = digitos.slice(0, i) + digitos.slice(i + 2)
        if (sinQuince.length === 10) {
          digitos = sinQuince
          break
        }
      }
    }
  }

  if (digitos.length !== 10) {
    // Se rechaza en vez de guardar algo raro: un teléfono mal normalizado es el
    // que después duplica al cliente, y es mucho más barato pedirlo de nuevo.
    throw badRequest(
      "El teléfono no parece válido. Escribilo con característica, por ejemplo 223 123 4567.",
    )
  }

  return `549${digitos}`
}

/** Parte "María Fernanda López" en nombre y apellido para las dos columnas de la tabla. */
export function partirNombre(completo: string): { nombre: string; apellido: string | null } {
  const partes = completo.trim().split(/\s+/)
  if (partes.length === 1) return { nombre: partes[0], apellido: null }
  return { nombre: partes.slice(0, -1).join(" "), apellido: partes[partes.length - 1] }
}

/**
 * Devuelve el id del cliente con ese teléfono, creándolo si no existe.
 *
 * Va siempre dentro de la transacción de quien llama (`conn`), para que el
 * cliente y su turno o pedido entren juntos o no entren.
 *
 * Si el cliente ya existía, se completan los datos que estaban vacíos pero no se
 * sobreescriben los que ya tenía: las `notas` son de la dueña y no las puede
 * pisar un formulario de la web.
 */
export async function obtenerOCrearCliente(
  conn: PoolConnection,
  contacto: ContactoCliente,
): Promise<number> {
  const telefono = normalizarTelefono(contacto.telefono)

  const [existentes] = await conn.query<RowDataPacket[]>(
    "SELECT id FROM clientes WHERE telefono = ? FOR UPDATE",
    [telefono],
  )

  if (existentes.length > 0) {
    const id = existentes[0].id as number
    await conn.query(
      `UPDATE clientes
          SET email    = COALESCE(email, ?),
              apellido = COALESCE(apellido, ?)
        WHERE id = ?`,
      [contacto.email ?? null, contacto.apellido ?? null, id],
    )
    return id
  }

  const [result] = await conn.query(
    `INSERT INTO clientes (nombre, apellido, telefono, email, notas)
     VALUES (?, ?, ?, ?, ?)`,
    [contacto.nombre, contacto.apellido ?? null, telefono, contacto.email ?? null, contacto.notas ?? null],
  )
  return (result as { insertId: number }).insertId
}
