import Pestanas from "../shared/components/Pestanas"

/** Finanzas: la caja de cada día (lo principal) y el análisis del negocio. */
export default function FinanzasTabs() {
  return (
    <Pestanas
      etiqueta="Secciones de Finanzas"
      pestanas={[
        { to: "/finanzas", end: true, label: "🧾 Caja" },
        { to: "/finanzas/analisis", label: "📈 Análisis" },
      ]}
    />
  )
}
