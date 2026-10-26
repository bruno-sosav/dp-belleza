import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import PageHeader from "../../../shared/components/PageHeader"
import Panel from "../../../shared/components/Panel"
import BotonWhatsApp from "../../../components/turnos/BotonWhatsApp"
import FormularioCliente from "../components/FormularioCliente"
import { Cargando, ErrorCarga } from "../../../shared/components/EstadoCarga"
import { formatDayMonth, formatTelefono } from "../../../shared/lib/format"
import { inputClass, primaryButtonClass } from "../../../shared/lib/styles"
import { nombreCompleto, useClientes } from "../api/clientes.api"

/** Espera a que termine de escribir antes de buscar: un pedido por búsqueda, no por letra. */
function useDemorado(valor: string, ms = 300) {
  const [demorado, setDemorado] = useState(valor)
  useEffect(() => {
    const id = setTimeout(() => setDemorado(valor), ms)
    return () => clearTimeout(id)
  }, [valor, ms])
  return demorado
}

/**
 * Lista de clientas con un buscador grande arriba. Tocar una clienta abre su ficha.
 *
 * Cada fila responde lo que la dueña quiere saber de un vistazo: quién es, cómo
 * escribirle, cuántas veces vino y si tiene un turno pedido.
 */
export default function CustomersPage() {
  const navigate = useNavigate()
  const eliminada = (useLocation().state as { eliminada?: string } | null)?.eliminada
  const [busqueda, setBusqueda] = useState("")
  const [agregando, setAgregando] = useState(false)
  const q = useDemorado(busqueda.trim())
  const { datos, cargando, error, recargar } = useClientes(q)

  return (
    <div>
      <PageHeader
        title="Clientas"
        description="Todas las personas que reservaron un turno o compraron en la tienda."
        withPeriod={false}
        action={
          !agregando && (
            <button type="button" onClick={() => setAgregando(true)} className={`${primaryButtonClass} min-h-12 px-6 text-base`}>
              + Agregar clienta
            </button>
          )
        }
      />

      {eliminada && !agregando && (
        <p className="mb-6 rounded-xl bg-cream-dark px-4 py-3 text-base text-ink" role="status">
          🗑️ {eliminada} se eliminó.
        </p>
      )}

      {agregando && (
        <Panel title="Nueva clienta" description="Para las que te piden turno por teléfono o en persona. Las que reservan por la web se agregan solas." className="mb-6">
          <FormularioCliente
            onCancelar={() => setAgregando(false)}
            onGuardado={(nueva) => navigate(`/clientes/${nueva.id}`)}
          />
        </Panel>
      )}

      <label htmlFor="buscar-clienta" className="sr-only">
        Buscar clienta
      </label>
      <input
        id="buscar-clienta"
        type="search"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="🔍  Buscar por nombre o teléfono"
        autoComplete="off"
        className={`${inputClass} py-4 text-lg`}
      />

      <Panel className="mt-6">
        {!datos && cargando ? (
          <Cargando />
        ) : !datos ? (
          <ErrorCarga mensaje={error ?? "No se pudieron cargar las clientas."} onReintentar={recargar} />
        ) : datos.length === 0 ? (
          <p className="py-10 text-center text-base text-ink-soft">
            {q ? `No hay ninguna clienta que coincida con “${q}”.` : "Todavía no hay clientas."}
          </p>
        ) : (
          <>
            <p className="mb-3 text-sm text-ink-soft">
              {datos.length === 1 ? "1 clienta" : `${datos.length} clientas`}
              {cargando && " · buscando…"}
            </p>
            <ul className="divide-y divide-cream-dark">
              {datos.map((c) => {
                const nombre = nombreCompleto(c)
                return (
                  <li key={c.id} className="flex items-center gap-4 py-4">
                    <Link to={`/clientes/${c.id}`} className="group min-w-0 flex-1">
                      <p className="truncate text-xl font-semibold text-ink group-hover:text-rose-dark group-hover:underline">{nombre}</p>
                      <p className="text-base text-ink-soft">{formatTelefono(c.telefono)}</p>
                      <p className="mt-1 text-sm text-ink-soft">
                        {c.visitas === 0
                          ? "Todavía no vino"
                          : `Vino ${c.visitas} ${c.visitas === 1 ? "vez" : "veces"}${c.ultimaVisita ? ` · la última el ${formatDayMonth(c.ultimaVisita)}` : ""}`}
                      </p>
                      {c.proximoTurno && (
                        <p className="mt-1.5 inline-block rounded-full bg-rose/30 px-3 py-0.5 text-sm font-medium text-ink">
                          Próximo turno: {formatDayMonth(c.proximoTurno.slice(0, 10))} a las {c.proximoTurno.slice(11, 16)}
                        </p>
                      )}
                    </Link>
                    <BotonWhatsApp telefono={c.telefono} nombre={nombre} />
                    <Link
                      to={`/clientes/${c.id}`}
                      className="hidden shrink-0 rounded-xl border-2 border-cream-dark px-4 py-3 text-base font-medium text-ink transition hover:border-ink sm:inline-flex"
                    >
                      Ver ficha →
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </Panel>
    </div>
  )
}
