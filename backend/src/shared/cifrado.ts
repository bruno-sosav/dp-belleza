/**
 * Cifrado de credenciales guardadas en la base (por ahora, las de Mercado Pago).
 *
 * AES-256-GCM: además de ocultar el texto, detecta si alguien lo modificó. La
 * clave sale de CREDENCIALES_KEY (64 caracteres hex, `openssl rand -hex 32`).
 * Si no está, se deriva de JWT_SECRET, así el proyecto arranca sin configurar
 * nada nuevo; en producción conviene tener una propia, porque cambiar
 * JWT_SECRET dejaría ilegibles las credenciales guardadas.
 *
 * Formato guardado: "v1:<iv>:<tag>:<cifrado>", todo en base64.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"
import { config } from "./config.js"

function clave(): Buffer {
  const propia = process.env.CREDENCIALES_KEY
  if (propia) {
    if (!/^[0-9a-f]{64}$/i.test(propia)) throw new Error("CREDENCIALES_KEY tiene que ser 64 caracteres hex (openssl rand -hex 32)")
    return Buffer.from(propia, "hex")
  }
  return createHash("sha256").update(`credenciales:${config.jwtSecret}`).digest()
}

export function cifrar(texto: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", clave(), iv)
  const cifrado = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()])
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), cifrado.toString("base64")].join(":")
}

export function descifrar(guardado: string): string {
  const [version, iv, tag, cifrado] = guardado.split(":")
  if (version !== "v1" || !iv || !tag || !cifrado) throw new Error("Credencial guardada con un formato desconocido")
  const decipher = createDecipheriv("aes-256-gcm", clave(), Buffer.from(iv, "base64"))
  decipher.setAuthTag(Buffer.from(tag, "base64"))
  return Buffer.concat([decipher.update(Buffer.from(cifrado, "base64")), decipher.final()]).toString("utf8")
}
