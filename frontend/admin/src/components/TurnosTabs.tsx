import Pestanas from "./Pestanas"

/** Turnos: la agenda, el horario de todas las semanas y los días que no se atiende. */
export default function TurnosTabs() {
  return (
    <Pestanas
      etiqueta="Secciones de Turnos"
      pestanas={[
        { to: "/turnos", end: true, label: "📅 Agenda" },
        { to: "/turnos/horario", label: "🕘 Horario" },
        { to: "/turnos/dias-cerrados", label: "🚫 Días cerrados" },
      ]}
    />
  )
}
