/**
 * Carga de datos para las pantallas del panel.
 *
 * Todas las secciones necesitan lo mismo: pedir, mostrar "cargando", mostrar el
 * error si falla, y poder recargar. Esto lo resuelve una vez para no repetirlo
 * en cada pantalla.
 *
 * No usa react-query ni similar a propósito: el panel hace pedidos simples y
 * agregar una librería de 40 kB para esto no se justifica en el TP.
 */
import { useCallback, useEffect, useState } from "react"
import { ApiError } from "./api"

export type Carga<T> = {
  datos: T | null
  cargando: boolean
  error: string | null
  recargar: () => void
}

/**
 * `pedir` tiene que ser estable o venir de useCallback: cada vez que cambia se
 * dispara un pedido nuevo.
 */
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
