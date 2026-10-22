import PageHeader from "../shared/components/PageHeader"
import TurnosTabs from "../components/TurnosTabs"
import DiasCerrados from "../components/agenda/DiasCerrados"

/**
 * Turnos → Días cerrados (/turnos/dias-cerrados): feriados, vacaciones o un
 * rato puntual en que no se atiende. Esos horarios dejan de ofrecerse en la web.
 */
export default function AdminClosedDays() {
  return (
    <div>
      <PageHeader
        title="Turnos"
        description="Los días u horas en que no atendés, por única vez."
        withPeriod={false}
        action={<TurnosTabs />}
      />
      <DiasCerrados />
    </div>
  )
}
