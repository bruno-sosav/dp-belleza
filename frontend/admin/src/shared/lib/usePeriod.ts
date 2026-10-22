import { useOutletContext } from "react-router-dom"
import type { Period } from "./stats"

export type AdminOutletContext = { period: Period; setPeriod: (p: Period) => void }

/** Período elegido en el filtro. Lo guarda AdminLayout, así se mantiene al cambiar de sección. */
export function usePeriod() {
  return useOutletContext<AdminOutletContext>()
}
