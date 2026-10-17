import PageHeader from "../components/PageHeader"
import TurnosTabs from "../components/TurnosTabs"
import IntervaloTurnos from "../components/agenda/IntervaloTurnos"
import CancelacionWeb from "../components/agenda/CancelacionWeb"

/**
 * Turnos → Reglas (/turnos/reglas): cómo se reserva y se cancela desde la web.
 * Cada regla es su propio panel con su propio botón de guardar.
 */
export default function AdminBookingRules() {
  return (
    <div>
      <PageHeader title="Turnos" description="Cómo reservan y cancelan las clientas desde la web." withPeriod={false} action={<TurnosTabs />} />
      <div className="space-y-6">
        <IntervaloTurnos />
        <CancelacionWeb />
      </div>
    </div>
  )
}
