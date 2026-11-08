import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { categoriesOf } from "@dp/shared/lib/servicios"
import { formatPrice } from "@dp/shared/lib/format"
import PageHeader from "../../../shared/components/PageHeader"
import Panel from "../../../shared/components/Panel"
import { Cargando, ErrorCarga } from "../../../shared/components/EstadoCarga"
import { ApiError } from "../../../shared/lib/api"
import { primaryButtonClass, secondaryButtonClass } from "../../../shared/lib/styles"
import { actualizarServicio, formatDuracion, useServiciosAdmin } from "../api/catalogo.api"
import type { ServicioAdmin } from "../api/catalogo.api"
import AvisoOk from "../../../shared/components/AvisoOk"
import Icono from "../../../shared/components/Icono"

/** Catálogo de servicios por categoría. No se borra: se pausa, así los turnos viejos siguen sumando. */
export default function ServicesPage() {
  const guardado = (useLocation().state as { guardado?: string } | null)?.guardado
  const { datos, cargando, error, recargar } = useServiciosAdmin()

  const activos = datos?.filter((s) => s.activo).length ?? 0
  const pausados = (datos?.length ?? 0) - activos

  return (
    <div>
      <PageHeader
        title="Servicios"
        description="Lo que ofrecés en la web: precio, duración y descripción de cada tratamiento."
        withPeriod={false}
        action={
          <Link to="/servicios/nuevo" className={`${primaryButtonClass} min-h-12 px-6 text-base`}>
            + Agregar servicio
          </Link>
        }
      />

      {guardado && (
        <AvisoOk className="mb-6 rounded-xl bg-exito-claro px-4 py-3">Se guardó “{guardado}”.</AvisoOk>
      )}

      <Panel>
        {!datos && cargando ? (
          <Cargando />
        ) : !datos ? (
          <ErrorCarga mensaje={error ?? "No se pudieron cargar los servicios."} onReintentar={recargar} />
        ) : datos.length === 0 ? (
          <p className="py-10 text-center text-base text-ink-soft">Todavía no hay servicios. Agregá el primero.</p>
        ) : (
          <>
            <p className="mb-2 text-sm text-ink-soft">
              {activos} {activos === 1 ? "servicio en la web" : "servicios en la web"}
              {pausados > 0 && ` · ${pausados} ${pausados === 1 ? "pausado" : "pausados"}`}
            </p>
            <div className="space-y-8">
              {categoriesOf(datos).map((categoria) => (
                <section key={categoria}>
                  <h2 className="border-b border-cream-dark pb-2 font-display text-xl font-semibold text-ink">{categoria}</h2>
                  <ul className="divide-y divide-cream-dark">
                    {datos
                      .filter((s) => s.category === categoria)
                      .map((s) => (
                        <FilaServicio key={s.id} servicio={s} onCambio={recargar} />
                      ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}
      </Panel>
    </div>
  )
}

function FilaServicio({ servicio, onCambio }: { servicio: ServicioAdmin; onCambio: () => void }) {
  const [confirmando, setConfirmando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function cambiarActivo(activo: boolean) {
    setOcupado(true)
    setError(null)
    try {
      await actualizarServicio(servicio.id, { activo })
      setConfirmando(false)
      onCambio()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el cambio.")
    } finally {
      setOcupado(false)
    }
  }

  return (
    <li className={`py-4 ${servicio.activo ? "" : "opacity-70"}`}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xl font-semibold text-ink">
            {servicio.name}
            {servicio.badge && (
              <span className="ml-2 inline-block rounded-full bg-rose/30 px-2.5 py-0.5 align-middle text-sm font-medium text-ink">
                {servicio.badge}
              </span>
            )}
          </p>
          <p className="text-base text-ink-soft">
            {formatDuracion(servicio.durationMin)} · {formatPrice(servicio.price)}
            {servicio.professional && ` · con ${servicio.professional}`}
          </p>
          {!servicio.activo && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-alerta-claro px-3 py-0.5 text-sm font-medium text-alerta">
              <Icono nombre="pausa" className="h-4 w-4" />
              Pausado: no se ve en la web
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to={`/servicios/${servicio.id}`} className={`${secondaryButtonClass} min-h-12 px-5 text-base`}>
            Editar
          </Link>
          {servicio.activo ? (
            <button
              type="button"
              disabled={ocupado}
              onClick={() => (servicio.turnosProximos > 0 ? setConfirmando(true) : void cambiarActivo(false))}
              className={`${secondaryButtonClass} min-h-12 px-5 text-base`}
            >
              Pausar
            </button>
          ) : (
            <button
              type="button"
              disabled={ocupado}
              onClick={() => void cambiarActivo(true)}
              className={`${secondaryButtonClass} min-h-12 px-5 text-base`}
            >
              Mostrar en la web
            </button>
          )}
        </div>
      </div>

      {confirmando && (
        <div className="mt-3 rounded-xl border border-alerta/40 bg-alerta-claro p-4">
          <p className="text-base text-ink">
            Tiene {servicio.turnosProximos} {servicio.turnosProximos === 1 ? "turno pedido" : "turnos pedidos"}. Esos se
            mantienen; solo deja de aparecer en la web para nuevas reservas.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={ocupado} onClick={() => void cambiarActivo(false)} className={`${primaryButtonClass} min-h-12 px-5 text-base`}>
              Pausar igual
            </button>
            <button type="button" onClick={() => setConfirmando(false)} className={`${secondaryButtonClass} min-h-12 px-5 text-base`}>
              No, dejarlo
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 rounded-lg bg-peligro-claro px-3 py-2 text-base text-peligro" role="alert">
          {error}
        </p>
      )}
    </li>
  )
}
