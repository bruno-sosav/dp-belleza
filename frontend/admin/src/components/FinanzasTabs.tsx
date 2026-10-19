import Pestanas from "./Pestanas"

/** Finanzas: lo que se ganó, cómo vienen los turnos y la caja de cada día. */
export default function FinanzasTabs() {
  return (
    <Pestanas
      etiqueta="Secciones de Finanzas"
      pestanas={[
        { to: "/finanzas", end: true, label: "💰 Ganancias" },
        { to: "/finanzas/turnos", label: "📊 Turnos" },
        { to: "/finanzas/caja", label: "🧾 Caja" },
      ]}
    />
  )
}
