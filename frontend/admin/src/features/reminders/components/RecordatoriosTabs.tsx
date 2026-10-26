import Pestanas from "../../../shared/components/Pestanas"

/** Recordatorios: a quién hay que mandarle hoy, y qué mensajes hay configurados. */
export default function RecordatoriosTabs() {
  return (
    <Pestanas
      etiqueta="Secciones de Recordatorios"
      pestanas={[
        { to: "/recordatorios", end: true, label: "📨 Para mandar" },
        { to: "/recordatorios/mensajes", label: "✏️ Mensajes" },
      ]}
    />
  )
}
