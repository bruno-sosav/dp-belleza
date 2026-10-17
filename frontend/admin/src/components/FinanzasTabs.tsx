import Pestanas from "./Pestanas"

/** Finanzas: lo que se ganó, y cómo vienen los turnos. */
export default function FinanzasTabs() {
  return (
    <Pestanas
      etiqueta="Secciones de Finanzas"
      pestanas={[
        { to: "/finanzas", end: true, label: "💰 Ganancias" },
        { to: "/finanzas/turnos", label: "📊 Turnos" },
      ]}
    />
  )
}
