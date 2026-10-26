import PageHeader from "../../../shared/components/PageHeader"
import TurnosTabs from "../components/TurnosTabs"
import DiasCerrados from "../components/DiasCerrados"

/** Turnos → Días cerrados: feriados, vacaciones o un rato puntual. */
export default function ClosedDaysPage() {
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
