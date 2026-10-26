import PageHeader from "../../../shared/components/PageHeader"
import Panel from "../../../shared/components/Panel"
import TurnosTabs from "../components/TurnosTabs"
import EditorHorario from "../components/EditorHorario"
import { Cargando, ErrorCarga } from "../../../shared/components/EstadoCarga"
import { useHorarios } from "../api/agenda.api"

/** Turnos → Horario: días y horas de atención semanales. */
export default function SchedulePage() {
  const horarios = useHorarios()

  return (
    <div>
      <PageHeader
        title="Turnos"
        description="Lo que cargues acá es lo que la web ofrece para reservar."
        withPeriod={false}
        action={<TurnosTabs />}
      />

      <div className="space-y-6">
        <Panel title="Horario de atención" description="Los días y horas en que atendés todas las semanas.">
          {horarios.error ? (
            <ErrorCarga mensaje={horarios.error} onReintentar={horarios.recargar} />
          ) : !horarios.datos ? (
            <Cargando />
          ) : (
            <EditorHorario horarios={horarios.datos} />
          )}
        </Panel>

      </div>
    </div>
  )
}
