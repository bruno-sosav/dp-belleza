import { useState } from "react"
import PageHeader from "../../../shared/components/PageHeader"
import RecordatoriosTabs from "../components/RecordatoriosTabs"
import Panel from "../../../shared/components/Panel"
import IconoWhatsApp from "../../../shared/components/IconoWhatsApp"
import { Cargando, ErrorCarga } from "../../../shared/components/EstadoCarga"
import { fromDateKey, sumarDias } from "../../../shared/lib/fechas"
import { formatCumple, formatLongDate } from "../../../shared/lib/format"
import { secondaryButtonClass } from "../../../shared/lib/styles"
import { useAhora } from "../../../shared/lib/useAhora"
import { whatsappCliente } from "../../../shared/lib/whatsapp"
import { nombreCompleto } from "../../customers/api/clientes.api"
import { deshacerAviso, registrarAviso, useRecordatorios } from "../api/recordatorios.api"
import type { AvisoParaMandar } from "../api/recordatorios.api"

/** Recordatorios → Para mandar. Abrir WhatsApp lo da por mandado (no hay forma de saberlo); queda "Deshacer". */
export default function RemindersPage() {
  const ahora = useAhora()
  const recordatorios = useRecordatorios()
  const [error, setError] = useState<string | null>(null)

  async function hacer(accion: () => Promise<unknown>) {
    setError(null)
    try {
      await accion()
    } catch {
      setError("No se pudo guardar. Fijate la conexión y volvé a intentar.")
    }
    recordatorios.recargar()
  }

  /** El renglón de contexto de cada aviso, según el momento. */
  const detalle = (a: AvisoParaMandar) => {
    if (a.momento === "cumpleanos" && a.cumple) {
      const cuando = a.cumple.faltan === 0 ? "¡Hoy!" : a.cumple.faltan === 1 ? "mañana" : `en ${a.cumple.faltan} días`
      return `🎂 Cumple el ${formatCumple(a.cumple)} · ${cuando}`
    }
    if (!a.turno) return ""
    if (a.momento === "despues") {
      const hace = Math.round((fromDateKey(ahora.fecha).getTime() - fromDateKey(a.turno.fecha).getTime()) / 86_400_000)
      return `Vino hace ${hace} días · ${a.turno.servicio}`
    }
    const { fecha, hora } = a.turno
    const dia =
      fecha === ahora.fecha
        ? "Hoy"
        : fecha === sumarDias(ahora.fecha, 1)
          ? "Mañana"
          : fecha === sumarDias(ahora.fecha, 2)
            ? "Pasado mañana"
            : formatLongDate(fecha).replace(/^./, (c) => c.toUpperCase())
    return `${dia} a las ${hora} · ${a.turno.servicio}`
  }

  const { datos } = recordatorios
  const paraMandar = datos?.paraMandar ?? []
  const hechos = datos?.hechosHoy ?? []

  // Agrupados por tipo ("Confirmación", "Recordatorio"), en el orden en que llegan.
  const grupos = paraMandar.reduce<{ nombre: string; avisos: AvisoParaMandar[] }[]>((acc, a) => {
    const grupo = acc.find((g) => g.nombre === a.tipo.nombre)
    if (grupo) grupo.avisos.push(a)
    else acc.push({ nombre: a.tipo.nombre, avisos: [a] })
    return acc
  }, [])

  return (
    <div>
      <PageHeader
        title="Recordatorios"
        description="Tocá el botón verde: se abre WhatsApp con el mensaje escrito, solo tenés que enviarlo."
        withPeriod={false}
        action={<RecordatoriosTabs />}
      />

      {error && (
        <p className="mb-4 rounded-lg bg-[#fbe4e2] px-4 py-3 text-base text-[#a12b28]" role="alert">
          {error}
        </p>
      )}

      {!datos && recordatorios.cargando ? (
        <Panel>
          <Cargando />
        </Panel>
      ) : !datos ? (
        <Panel>
          <ErrorCarga mensaje={recordatorios.error ?? "No se pudieron cargar los recordatorios."} onReintentar={recordatorios.recargar} />
        </Panel>
      ) : (
        <div className="space-y-6">
          {grupos.length === 0 ? (
            <Panel>
              <p className="py-8 text-center text-lg text-ink-soft">
                {hechos.length ? "✅ Ya mandaste todos. No queda ninguno por ahora." : "No hay recordatorios para mandar por ahora."}
              </p>
            </Panel>
          ) : (
            grupos.map((g) => (
              <Panel key={g.nombre} title={`${g.nombre} (${g.avisos.length})`}>
                <ul className="divide-y divide-cream-dark">
                  {g.avisos.map((a) => (
                    <li key={`${a.tipo.id}-${a.turno?.id ?? `c${a.cliente.id}`}`} className="py-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xl font-semibold text-ink">{nombreCompleto(a.cliente)}</p>
                          <p className="text-base text-ink-soft">{detalle(a)}</p>
                        </div>
                        <a
                          href={whatsappCliente(a.cliente.telefono, a.mensaje)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => void hacer(() => registrarAviso(a, "enviado"))}
                          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#25d366] px-5 text-base font-semibold text-white transition hover:bg-[#1da851]"
                        >
                          <IconoWhatsApp className="h-5 w-5" />
                          Mandar por WhatsApp
                        </a>
                        <button
                          type="button"
                          onClick={() => void hacer(() => registrarAviso(a, "omitido"))}
                          title="Por ejemplo, si ya hablaste con ella"
                          className={`${secondaryButtonClass} min-h-12 px-4 text-base`}
                        >
                          No hace falta
                        </button>
                      </div>
                      <p className="mt-2 rounded-lg bg-cream-dark/50 px-3 py-2 text-sm text-ink-soft">{a.mensaje}</p>
                    </li>
                  ))}
                </ul>
              </Panel>
            ))
          )}

          {hechos.length > 0 && (
            <Panel title="Hechos hoy" description="Si tocaste uno sin querer, deshacelo y vuelve a la lista.">
              <ul className="divide-y divide-cream-dark">
                {hechos.map((h) => (
                  <li key={h.id} className="flex items-center gap-3 py-3">
                    <p className="min-w-0 flex-1 text-base text-ink">
                      {h.estado === "enviado" ? "✓" : "—"} {nombreCompleto(h.cliente)}
                      <span className="text-ink-soft">
                        {" "}
                        · {h.tipo} · {h.estado === "enviado" ? "mandado" : "no hacía falta"}
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={() => void hacer(() => deshacerAviso(h.id))}
                      className="min-h-11 shrink-0 px-2 text-base text-ink-soft underline underline-offset-4 hover:text-ink"
                    >
                      Deshacer
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      )}
    </div>
  )
}
