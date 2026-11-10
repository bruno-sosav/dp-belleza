/** La cuenta de la API de Andreani del local: /api/admin/andreani (envios.controller.ts). Nunca vuelve la contraseña. */
import { useCallback } from "react"
import { api } from "../../../shared/lib/api"
import { useApi } from "../../../shared/lib/useApi"

export type CuentaAndreani = {
  usuario: string
  cliente: string
  contrato: string
  entorno: "qa" | "produccion"
  /** "2026-11-10 12:30": cuándo se probó el login con éxito. */
  verificadaAt: string | null
}

export type DatosCuentaAndreani = Omit<CuentaAndreani, "verificadaAt"> & { password: string }

/** null si el local no cargó la cuenta. */
export function useCuentaAndreani() {
  const pedir = useCallback(() => api<CuentaAndreani | null>("/api/admin/andreani"), [])
  return useApi(pedir)
}

/** El backend prueba el login con Andreani antes de guardar. */
export function guardarCuentaAndreani(datos: DatosCuentaAndreani) {
  return api<CuentaAndreani>("/api/admin/andreani", { metodo: "PUT", cuerpo: datos })
}

export function borrarCuentaAndreani() {
  return api<void>("/api/admin/andreani", { metodo: "DELETE" })
}
