/** Pedir + cargando + error + recargar, para todas las pantallas. Sin react-query: no hace falta. */
import { useCallback, useEffect, useState } from "react"
import { ApiError } from "./api"

export type Carga<T> = {
  datos: T | null
  cargando: boolean
  error: string | null
  recargar: () => void
}

/** `pedir` tiene que ser estable (useCallback): si cambia, se pide de nuevo. */
export function useApi<T>(pedir: () => Promise<T>): Carga<T> {
  const [intento, setIntento] = useState(0)
  // El resultado se guarda junto con QUÉ pedido lo produjo. Comparar eso con el
  // pedido actual permite DERIVAR si está cargando, en vez de un
  // setCargando(true) dentro del efecto, que dispara un render extra cada vez.
  const [resultado, setResultado] = useState<{
    pedir: () => Promise<T>
    intento: number
    datos: T | null
    error: string | null
  } | null>(null)

  useEffect(() => {
    let vivo = true
    pedir()
      .then((datos) => {
        if (vivo) setResultado({ pedir, intento, datos, error: null })
      })
      .catch((err) => {
        if (!vivo) return
        setResultado({
          pedir,
          intento,
          datos: null,
          error: err instanceof ApiError ? err.message : "Ocurrió un error inesperado.",
        })
      })
    // Si la pantalla se desmonta o cambia el pedido antes de que llegue la
    // respuesta, se descarta: una respuesta vieja no puede pisar a una nueva.
    return () => {
      vivo = false
    }
  }, [pedir, intento])

  const vigente = resultado?.pedir === pedir && resultado?.intento === intento

  return {
    // Mientras recarga se mantiene el valor anterior, así la pantalla no
    // parpadea. Quien quiera ocultarlo tiene `cargando`.
    datos: resultado?.datos ?? null,
    cargando: !vigente,
    error: vigente ? resultado.error : null,
    recargar: useCallback(() => setIntento((n) => n + 1), []),
  }
}
