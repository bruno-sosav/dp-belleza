import { useState } from "react"
import PageHeader from "../../../shared/components/PageHeader"
import Panel from "../../../shared/components/Panel"
import FinanzasTabs from "../components/FinanzasTabs"
import ResumenCaja from "../components/ResumenCaja"
import ListaCobros from "../components/ListaCobros"
import TurnosSinCobrar from "../components/TurnosSinCobrar"
import RegistrarCobro from "../components/RegistrarCobro"
import { Cargando, ErrorCarga } from "../../../shared/components/EstadoCarga"
import { sumarDias } from "../../../shared/lib/fechas"
import { formatLongDate } from "../../../shared/lib/format"
import { secondaryButtonClass } from "../../../shared/lib/styles"
import { useAhora } from "../../../shared/lib/useAhora"
import { useCaja } from "../api/caja.api"

const botonDia = `${secondaryButtonClass} min-h-12 px-4 text-base`

/** Finanzas → Caja: lo que entró en el día por medio de pago, lo que falta cobrar y los cobros. */
export default function CashPage() {
  const ahora = useAhora()
  const [fecha, setFecha] = useState(ahora.fecha)
  const caja = useCaja(fecha)
  const largo = formatLongDate(fecha)

  return (
    <div>
      <PageHeader title="Finanzas" description="Lo que entró cada día y cómo te pagaron." withPeriod={false} action={<FinanzasTabs />} />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setFecha(sumarDias(fecha, -1))} className={botonDia} aria-label="Día anterior">
          ← <span className="hidden sm:inline">Anterior</span>
        </button>
        <button type="button" onClick={() => setFecha(ahora.fecha)} disabled={fecha === ahora.fecha} className={`${botonDia} disabled:opacity-40`}>
          Hoy
        </button>
        <button type="button" onClick={() => setFecha(sumarDias(fecha, 1))} disabled={fecha >= ahora.fecha} className={`${botonDia} disabled:opacity-40`} aria-label="Día siguiente">
          <span className="hidden sm:inline">Siguiente</span> →
        </button>
        <h2 className="ml-1 font-display text-2xl font-semibold text-ink">{largo.charAt(0).toUpperCase() + largo.slice(1)}</h2>
      </div>

      {caja.error ? (
        <Panel>
          <ErrorCarga mensaje={caja.error} onReintentar={caja.recargar} />
        </Panel>
      ) : !caja.datos ? (
        <Panel>
          <Cargando />
        </Panel>
      ) : (
        <div className="space-y-6">
          <Panel>
            <ResumenCaja totales={caja.datos.totales} />
          </Panel>

          {caja.datos.sinCobrar.length > 0 && (
            <Panel title="Falta cobrar" description="Turnos que se hicieron este día y todavía no se cobraron enteros." className="border-[#e0b44a]">
              <TurnosSinCobrar turnos={caja.datos.sinCobrar} onCambio={caja.recargar} />
            </Panel>
          )}

          <Panel title="Lo que entró">
            <ListaCobros cobros={caja.datos.cobros} onCambio={caja.recargar} />
            <div className="mt-5 border-t border-cream-dark pt-5">
              <RegistrarCobro onCambio={caja.recargar} />
            </div>
          </Panel>
        </div>
      )}
    </div>
  )
}
