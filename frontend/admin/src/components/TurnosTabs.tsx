import Pestanas from "../shared/components/Pestanas"

/** Turnos: la agenda, el horario de todas las semanas, los días que no se atiende y las reglas de la web. */
export default function TurnosTabs() {
  return (
    <Pestanas
      etiqueta="Secciones de Turnos"
      pestanas={[
        { to: "/turnos", end: true, label: "📅 Agenda" },
        { to: "/turnos/horario", label: "🕘 Horario" },
        { to: "/turnos/dias-cerrados", label: "🚫 Días cerrados" },
        { to: "/turnos/reglas", label: "⚙️ Reglas" },
      ]}
    />
  )
}
