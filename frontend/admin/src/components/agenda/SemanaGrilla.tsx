import { asignarCarriles, aMinutos, coloresBloque } from "../../lib/agenda"
import { diaSemanaISO, fromDateKey } from "../../lib/fechas"
import { weekdayShort } from "../../lib/format"
import type { Ahora } from "../../lib/useAhora"
import { nombreCliente } from "../../data/turnos"
import type { Turno } from "../../data/turnos"
import type { Horario } from "../../data/horarios"

/** Alto de una hora en la grilla. Generoso a propósito: un turno de 30 minutos tiene que poder leerse. */
const PX_POR_HORA = 80


/**
 * Rango de horas a dibujar: del horario de apertura más temprano al cierre más
 * tarde de la semana, estirado si algún turno queda afuera. Redondeado a horas.
 */
function rangoDeHoras(horarios: Horario[], turnos: Turno[]) {
  const inicios = [...horarios.map((h) => aMinutos(h.desde)), ...turnos.map((t) => aMinutos(t.horaInicio))]
  const fines = [...horarios.map((h) => aMinutos(h.hasta)), ...turnos.map((t) => aMinutos(t.horaFin))]
  const desde = inicios.length ? Math.floor(Math.min(...inicios) / 60) * 60 : 9 * 60
  const hasta = fines.length ? Math.ceil(Math.max(...fines) / 60) * 60 : 20 * 60
  return { desde, hasta }
}

/**
 * La semana como en una agenda de papel: un día por columna, las horas para
 * abajo, y cada turno como un bloque del alto de lo que dura.
 *
 * Las horas en que el local está cerrado van en gris. Tocar un turno lo abre.
 */
export default function SemanaGrilla({
  dias,
  turnos,
  horarios,
  ahora,
  onElegir,
}: {
  /** Las 7 fechas de la semana, de lunes a domingo. */
  dias: string[]
  turnos: Turno[]
  horarios: Horario[]
  ahora: Ahora
  onElegir: (turno: Turno) => void
}) {
  const { desde, hasta } = rangoDeHoras(horarios, turnos)
  const alto = ((hasta - desde) / 60) * PX_POR_HORA
  const y = (minutos: number) => ((minutos - desde) / 60) * PX_POR_HORA
  const horas = Array.from({ length: (hasta - desde) / 60 + 1 }, (_, i) => desde + i * 60)

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[760px] grid-cols-[64px_repeat(7,minmax(0,1fr))]">
        {/* Encabezado: nombre y número de cada día */}
        <div />
        {dias.map((fecha) => {
          const esHoy = fecha === ahora.fecha
          const d = fromDateKey(fecha)
          return (
            <div key={fecha} className="pb-3 text-center">
              <p className={`text-sm uppercase tracking-wide ${esHoy ? "font-semibold text-rose-dark" : "text-ink-soft"}`}>{weekdayShort[d.getDay()]}</p>
              <p
                className={`mx-auto mt-1 flex h-10 w-10 items-center justify-center rounded-full text-xl font-semibold ${
                  esHoy ? "bg-rose-dark text-white" : "text-ink"
                }`}
              >
                {d.getDate()}
              </p>
            </div>
          )
        })}

        {/* Columna de horas */}
        <div className="relative" style={{ height: alto }}>
          {horas.map((m) => (
            <span key={m} className="absolute right-3 -translate-y-1/2 text-sm tabular-nums text-ink-soft" style={{ top: y(m) }}>
              {String(m / 60).padStart(2, "0")}:00
            </span>
          ))}
        </div>

        {dias.map((fecha) => {
          const abierto = horarios.filter((h) => h.diaSemana === diaSemanaISO(fecha))
          const delDia = turnos.filter((t) => t.fecha === fecha)
          const carriles = asignarCarriles(delDia)
          const esHoy = fecha === ahora.fecha
          const ahoraMin = aMinutos(ahora.hora)

          return (
            <div key={fecha} className="relative border-l border-cream-dark bg-cream-dark/60" style={{ height: alto }}>
              {/* Franjas abiertas en blanco; lo que queda gris es "cerrado" */}
              {abierto.map((h) => (
                <div
                  key={h.desde}
                  className={`absolute inset-x-0 ${esHoy ? "bg-rose/5" : "bg-surface"}`}
                  style={{ top: y(aMinutos(h.desde)), height: y(aMinutos(h.hasta)) - y(aMinutos(h.desde)) }}
                />
              ))}
              {abierto.length === 0 && delDia.length === 0 && (
                <p className="absolute inset-x-0 top-6 text-center text-sm font-medium text-ink-soft">Cerrado</p>
              )}

              {/* Líneas de cada hora */}
              {horas.map((m) => (
                <div key={m} className="pointer-events-none absolute inset-x-0 border-t border-cream-dark" style={{ top: y(m) }} />
              ))}

              {delDia.map((t) => {
                const inicio = aMinutos(t.horaInicio)
                const fin = aMinutos(t.horaFin)
                const { carril, carriles: total } = carriles.get(t.id) ?? { carril: 0, carriles: 1 }
                const corto = fin - inicio < 45
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onElegir(t)}
                    title={`${t.horaInicio} a ${t.horaFin} · ${nombreCliente(t)} · ${t.servicio.nombre}`}
                    className={`absolute overflow-hidden rounded-lg border-l-4 px-2 py-1 text-left shadow-sm transition hover:z-10 hover:shadow-md focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-ink ${coloresBloque[t.estado]}`}
                    style={{
                      top: y(inicio) + 1,
                      height: Math.max(y(fin) - y(inicio) - 2, 28),
                      left: `calc(${(carril / total) * 100}% + 3px)`,
                      width: `calc(${100 / total}% - 6px)`,
                    }}
                  >
                    <p className="text-sm font-semibold leading-tight">
                      {t.horaInicio}
                      {corto && <span className="font-normal"> · {t.cliente.nombre}</span>}
                    </p>
                    {!corto && <p className="truncate text-sm font-semibold leading-tight">{nombreCliente(t)}</p>}
                    {!corto && <p className="truncate text-xs leading-tight opacity-80">{t.servicio.nombre}</p>}
                  </button>
                )
              })}

              {/* Línea roja de "ahora", solo en la columna de hoy y dentro del rango */}
              {esHoy && ahoraMin >= desde && ahoraMin <= hasta && (
                <div className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-[#c0392b]" style={{ top: y(ahoraMin) }}>
                  <span className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full bg-[#c0392b]" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
