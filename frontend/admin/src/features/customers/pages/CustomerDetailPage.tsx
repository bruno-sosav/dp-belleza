import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { formatPrice } from "@dp/shared/lib/format"
import Panel from "../../../shared/components/Panel"
import StatTile from "../../../shared/components/StatTile"
import EstadoBadge from "../../appointments/components/EstadoBadge"
import IconoWhatsApp from "../../../shared/components/IconoWhatsApp"
import NotasCliente from "../components/NotasCliente"
import FormularioCliente from "../components/FormularioCliente"
import EliminarCliente from "../components/EliminarCliente"
import UnirCliente from "../components/UnirCliente"
import { Cargando, ErrorCarga } from "../../../shared/components/EstadoCarga"
import { formatCumple, formatDayMonth, formatShortDate, formatTelefono } from "../../../shared/lib/format"
import { secondaryButtonClass } from "../../../shared/lib/styles"
import { whatsappCliente } from "../../../shared/lib/whatsapp"
import { nombreCompleto, useFichaCliente } from "../api/clientes.api"
import type { FichaCliente } from "../api/clientes.api"

/** Cuántos turnos se muestran antes del botón "Ver todos". */
const TURNOS_VISIBLES = 10

const estadoPedido: Record<string, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  entregado: "Entregado",
  cancelado: "Cancelado",
}

/**
 * Ficha de una clienta: cómo contactarla, qué tan seguido viene, cuánto gastó,
 * las notas de la dueña y los historiales de turnos y de compras.
 */
export default function CustomerDetailPage() {
  const id = Number(useParams().id)
  const { datos, cargando, error, recargar } = useFichaCliente(id)

  const volver = (
    <Link to="/clientes" className="mb-4 inline-flex items-center gap-1 text-base text-ink-soft hover:text-ink">
      ← Volver a clientas
    </Link>
  )

  if (!datos && cargando) {
    return (
      <div>
        {volver}
        <Panel>
          <Cargando alto="h-64" />
        </Panel>
      </div>
    )
  }
  if (!datos) {
    return (
      <div>
        {volver}
        <Panel>
          <ErrorCarga mensaje={error ?? "No se pudo cargar la clienta."} onReintentar={recargar} alto="h-64" />
        </Panel>
      </div>
    )
  }

  // key: si se navega de una ficha a otra, los formularios arrancan de cero.
  return (
    <div key={datos.id}>
      {volver}
      <Ficha cliente={datos} recargar={recargar} />
    </div>
  )
}

function Ficha({ cliente, recargar }: { cliente: FichaCliente; recargar: () => void }) {
  const [editando, setEditando] = useState(false)
  const [verTodos, setVerTodos] = useState(false)
  const nombre = nombreCompleto(cliente)
  const turnos = verTodos ? cliente.turnos : cliente.turnos.slice(0, TURNOS_VISIBLES)

  return (
    <>
      <Panel>
        {editando ? (
          <>
            <h1 className="mb-5 font-display text-2xl font-semibold text-ink">Editar datos</h1>
            <FormularioCliente
              cliente={cliente}
              onCancelar={() => setEditando(false)}
              onGuardado={() => {
                setEditando(false)
                recargar()
              }}
            />
          </>
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-semibold text-ink">{nombre}</h1>
              <p className="mt-2 text-xl text-ink">{formatTelefono(cliente.telefono)}</p>
              {cliente.email && <p className="mt-1 text-base text-ink-soft">{cliente.email}</p>}
              {cliente.cumple && <p className="mt-1 text-base text-ink">🎂 Cumple el {formatCumple(cliente.cumple)}</p>}
              <p className="mt-2 text-sm text-ink-soft">Clienta desde el {formatDayMonth(cliente.clienteDesde)} de {cliente.clienteDesde.slice(0, 4)}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={whatsappCliente(cliente.telefono)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#25d366] px-5 text-base font-semibold text-white transition hover:bg-[#1da851]"
              >
                <IconoWhatsApp className="h-6 w-6" /> Escribirle
              </a>
              <button type="button" onClick={() => setEditando(true)} className={`${secondaryButtonClass} min-h-12 px-5 text-base`}>
                ✏️ Editar datos
              </button>
            </div>
          </div>
        )}
      </Panel>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Veces que vino"
          value={String(cliente.visitas)}
          nota={cliente.ultimaVisita ? `La última, el ${formatDayMonth(cliente.ultimaVisita)}` : "Todavía no vino"}
        />
        <StatTile
          label="Gastó en total"
          value={formatPrice(cliente.gastado.total)}
          nota={`${formatPrice(cliente.gastado.turnos)} en turnos · ${formatPrice(cliente.gastado.tienda)} en la tienda`}
        />
        <StatTile
          label="Próximo turno"
          value={cliente.proximoTurno ? cliente.proximoTurno.slice(11, 16) : "—"}
          nota={cliente.proximoTurno ? formatShortDate(cliente.proximoTurno.slice(0, 10)) : "No tiene turnos pedidos"}
        />
        <StatTile
          label="Veces que no vino"
          value={String(cliente.ausencias)}
          nota={cliente.ausencias ? "Sin avisar" : "Siempre vino ✅"}
        />
      </div>

      <Panel title="Notas" description="Solo las ves vos. La clienta no las ve." className="mt-6">
        <NotasCliente id={cliente.id} notas={cliente.notas} onGuardado={recargar} />
      </Panel>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <Panel title="Turnos" description={cliente.turnos.length ? `${cliente.turnos.length} en total, del más nuevo al más viejo.` : undefined}>
          {cliente.turnos.length === 0 ? (
            <p className="py-6 text-center text-base text-ink-soft">Todavía no reservó ningún turno.</p>
          ) : (
            <>
              <ul className="divide-y divide-cream-dark">
                {turnos.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                    <span className="w-28 shrink-0 text-base text-ink">
                      {formatShortDate(t.fecha)} <span className="tabular-nums text-ink-soft">{t.horaInicio}</span>
                    </span>
                    <span className="min-w-0 flex-1 text-base text-ink">
                      {t.servicio}
                      <span className="block text-sm text-ink-soft">{formatPrice(t.precio)}</span>
                    </span>
                    <EstadoBadge estado={t.estado} />
                  </li>
                ))}
              </ul>
              {cliente.turnos.length > TURNOS_VISIBLES && (
                <button type="button" onClick={() => setVerTodos((v) => !v)} className={`${secondaryButtonClass} mt-4 w-full text-base`}>
                  {verTodos ? "Ver menos" : `Ver los ${cliente.turnos.length} turnos`}
                </button>
              )}
            </>
          )}
        </Panel>

        <Panel title="Compras en la tienda">
          {cliente.pedidos.length === 0 ? (
            <p className="py-6 text-center text-base text-ink-soft">Todavía no compró en la tienda.</p>
          ) : (
            <ul className="divide-y divide-cream-dark">
              {cliente.pedidos.map((p) => (
                <li key={p.id} className="flex items-baseline justify-between gap-3 py-3 text-base">
                  <span>
                    <span className="block text-ink">
                      #{p.id} · {formatShortDate(p.fecha)}
                    </span>
                    <span className="block text-sm text-ink-soft">
                      {p.unidades} {p.unidades === 1 ? "producto" : "productos"} · {estadoPedido[p.estado] ?? p.estado}
                    </span>
                  </span>
                  <span className={`shrink-0 font-medium tabular-nums ${p.estado === "cancelado" ? "text-ink-soft line-through" : "text-ink"}`}>
                    {formatPrice(p.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="¿Tiene otra ficha?" className="mt-6">
        <UnirCliente cliente={cliente} onUnida={recargar} />
      </Panel>

      <Panel title="Eliminar" className="mt-6">
        <EliminarCliente
          id={cliente.id}
          nombre={nombre}
          tieneHistorial={cliente.turnos.length > 0 || cliente.pedidos.length > 0}
        />
      </Panel>
    </>
  )
}
