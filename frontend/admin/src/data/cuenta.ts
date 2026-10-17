/** Ajustes → Tu cuenta: /api/admin/cuenta. */
import { useCallback } from "react"
import { api } from "../lib/api"
import { useApi } from "../lib/useApi"
import type { Usuario } from "../lib/auth"

export function useCuenta() {
  const pedir = useCallback(() => api<{ nombre: string; email: string }>("/api/admin/cuenta"), [])
  return useApi(pedir)
}

/** Cambiar el email pide la contraseña actual. Devuelve un token nuevo (el nombre va adentro). */
export function guardarCuenta(datos: { nombre: string; email: string; contrasenaActual?: string }) {
  return api<{ usuario: Usuario; token: string; email: string }>("/api/admin/cuenta", { metodo: "PATCH", cuerpo: datos })
}

export function cambiarContrasena(actual: string, nueva: string) {
  return api<void>("/api/admin/cuenta/contrasena", { metodo: "POST", cuerpo: { actual, nueva } })
}
