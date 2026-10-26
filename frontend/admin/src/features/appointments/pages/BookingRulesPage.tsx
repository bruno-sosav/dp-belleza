import PageHeader from "../../../shared/components/PageHeader"
import TurnosTabs from "../components/TurnosTabs"
import IntervaloTurnos from "../components/IntervaloTurnos"
import CancelacionWeb from "../components/CancelacionWeb"
import AnticipacionReserva from "../components/AnticipacionReserva"

/** Turnos → Reglas: cómo se reserva y se cancela desde la web. */
export default function BookingRulesPage() {
  return (
    <div>
      <PageHeader title="Turnos" description="Cómo reservan y cancelan las clientas desde la web." withPeriod={false} action={<TurnosTabs />} />
      <div className="space-y-6">
        <AnticipacionReserva />
        <IntervaloTurnos />
        <CancelacionWeb />
      </div>
    </div>
  )
}
