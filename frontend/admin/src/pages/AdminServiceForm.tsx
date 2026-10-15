import { useState } from "react"
import type { FormEvent, ReactNode } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { categoriesOf } from "@dp/shared/data/services"
import type { ServiceBadge } from "@dp/shared/data/services"
import PageHeader from "../components/PageHeader"
import Panel from "../components/Panel"
import { Cargando, ErrorCarga } from "../components/EstadoCarga"
import { ApiError } from "../lib/api"
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "../lib/styles"
import { actualizarServicio, crearServicio, formatDuracion, useServicioAdmin, useServiciosAdmin } from "../data/servicios"
import type { DatosServicio, ServicioAdmin } from "../data/servicios"

const campo = `${inputClass} py-3 text-base`

/** De 15 minutos a 3 horas. Un desplegable y no un número suelto: no hay forma de poner "600". */
const duraciones = Array.from({ length: 12 }, (_, i) => (i + 1) * 15)

const etiquetas: { valor: ServiceBadge | ""; label: string }[] = [
  { valor: "", label: "Ninguna" },
  { valor: "Nuevo", label: "Nuevo" },
  { valor: "Más elegido", label: "Más elegido" },
  { valor: "Promo", label: "Promo" },
]

/**
 * Alta y edición de un servicio (/servicios/nuevo y /servicios/:id).
 *
 * Arriba lo obligatorio (nombre, categoría, precio, duración), abajo lo que solo
 * hace más linda la página del servicio en la web. Así la dueña puede cargar
 * uno rápido y completarlo después.
 */
export default function AdminServiceForm() {
  const { id } = useParams()
  const servicioId = id && id !== "nuevo" ? Number(id) : null
  const servicio = useServicioAdmin(servicioId)
  const todos = useServiciosAdmin()

  const titulo = servicioId ? "Editar servicio" : "Nuevo servicio"
  const volver = (
    <Link to="/servicios" className={`${secondaryButtonClass} min-h-12 px-5 text-base`}>
      ← Volver a servicios
    </Link>
  )

  if (servicio.error) {
    return (
      <div>
        <PageHeader title={titulo} withPeriod={false} action={volver} />
        <Panel>
          <ErrorCarga mensaje={servicio.error} onReintentar={servicio.recargar} />
        </Panel>
      </div>
    )
  }
  if (servicio.cargando) {
    return (
      <div>
        <PageHeader title={titulo} withPeriod={false} action={volver} />
        <Panel>
          <Cargando />
        </Panel>
      </div>
    )
  }

  // Las categorías que ya existen, para tocarlas en vez de escribirlas.
  const categorias = todos.datos ? categoriesOf(todos.datos) : []

  return (
    <div>
      <PageHeader
        title={titulo}
        description={servicioId ? "Los turnos ya dados no cambian: guardan el precio y la duración con que se pidieron." : "Aparece en la web apenas lo guardás."}
        withPeriod={false}
        action={volver}
      />
      {/* key: si se pasa de un servicio a otro, el formulario arranca de cero. */}
      <Formulario key={servicioId ?? "nuevo"} servicio={servicio.datos} categorias={categorias} />
    </div>
  )
}

function Formulario({ servicio, categorias }: { servicio: ServicioAdmin | null; categorias: string[] }) {
  const navigate = useNavigate()
  const [nombre, setNombre] = useState(servicio?.name ?? "")
  const [categoria, setCategoria] = useState(servicio?.category ?? "")
  const [precio, setPrecio] = useState(servicio ? String(servicio.price) : "")
  const [duracion, setDuracion] = useState(servicio?.durationMin ?? 60)
  const [descripcionCorta, setDescripcionCorta] = useState(servicio?.shortDescription ?? "")
  const [descripcion, setDescripcion] = useState(servicio?.description ?? "")
  const [incluye, setIncluye] = useState((servicio?.includes ?? []).join("\n"))
  const [profesional, setProfesional] = useState(servicio?.professional ?? "")
  const [etiqueta, setEtiqueta] = useState<ServiceBadge | "">(servicio?.badge ?? "")
  const [sesiones, setSesiones] = useState(servicio?.recommendedSessions ? String(servicio.recommendedSessions) : "")
  const [foto, setFoto] = useState(servicio?.image ?? "")
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Si la duración guardada no es múltiplo de 15 (cargada a mano en la base), igual tiene que aparecer.
  const opcionesDuracion = duraciones.includes(duracion) ? duraciones : [...duraciones, duracion].sort((a, b) => a - b)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    // "$ 25.000" o "25000" → 25000. En Argentina el punto es de miles.
    const precioNumero = Number(precio.replace(/[^\d,]/g, "").replace(",", "."))
    if (!precio.trim() || Number.isNaN(precioNumero)) {
      setError("Revisá el precio: tiene que ser un número, por ejemplo 25000.")
      return
    }
    setGuardando(true)
    setError(null)
    const datos: DatosServicio = {
      name: nombre.trim(),
      category: categoria.trim(),
      price: precioNumero,
      durationMin: duracion,
      shortDescription: descripcionCorta.trim() || null,
      description: descripcion.trim() || null,
      image: foto.trim() || null,
      includes: incluye.split("\n").map((l) => l.trim()).filter(Boolean),
      professional: profesional.trim() || null,
      badge: etiqueta || null,
      recommendedSessions: sesiones ? Number(sesiones) : null,
    }
    try {
      const guardado = servicio ? await actualizarServicio(servicio.id, datos) : await crearServicio(datos)
      navigate("/servicios", { state: { guardado: guardado.name } })
    } catch (err) {
      setError(err instanceof ApiError ? mensajeDeError(err) : "No se pudo guardar el servicio.")
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={guardar} className="space-y-6">
      <Panel title="Lo principal">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Campo label="Nombre" htmlFor="sv-nombre" className="sm:col-span-2">
            <input id="sv-nombre" required maxLength={150} autoFocus={!servicio} placeholder="Ej: Limpieza facial profunda" value={nombre} onChange={(e) => setNombre(e.target.value)} className={campo} />
          </Campo>

          <Campo label="Categoría" htmlFor="sv-categoria" ayuda="Tocá una de las que ya tenés o escribí una nueva." className="sm:col-span-2">
            <input id="sv-categoria" required maxLength={60} placeholder="Ej: Facial" value={categoria} onChange={(e) => setCategoria(e.target.value)} className={campo} />
            {categorias.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {categorias.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategoria(c)}
                    aria-pressed={c === categoria.trim()}
                    className={`min-h-11 rounded-full border px-4 text-base transition ${
                      c === categoria.trim() ? "border-ink bg-ink text-cream" : "border-cream-dark bg-surface text-ink hover:border-rose-dark"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </Campo>

          <Campo label="Precio por sesión" htmlFor="sv-precio">
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-ink-soft">$</span>
              <input id="sv-precio" required inputMode="numeric" placeholder="25000" value={precio} onChange={(e) => setPrecio(e.target.value)} className={`${campo} pl-8`} />
            </div>
          </Campo>

          <Campo label="Duración" htmlFor="sv-duracion" ayuda="Es lo que ocupa en la agenda.">
            <select id="sv-duracion" value={duracion} onChange={(e) => setDuracion(Number(e.target.value))} className={campo}>
              {opcionesDuracion.map((m) => (
                <option key={m} value={m}>
                  {formatDuracion(m)}
                </option>
              ))}
            </select>
          </Campo>
        </div>
      </Panel>

      <Panel title="Cómo se ve en la web" description="Todo esto es opcional.">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Campo label="Resumen" htmlFor="sv-corta" ayuda="Una línea, aparece en la tarjeta del servicio." className="sm:col-span-2">
            <input id="sv-corta" maxLength={255} placeholder="Ej: Limpieza, extracción e hidratación." value={descripcionCorta} onChange={(e) => setDescripcionCorta(e.target.value)} className={campo} />
          </Campo>

          <Campo label="Descripción" htmlFor="sv-descripcion" className="sm:col-span-2">
            <textarea id="sv-descripcion" rows={4} maxLength={5000} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={`${campo} resize-y`} />
          </Campo>

          <Campo label="Qué incluye" htmlFor="sv-incluye" ayuda="Una cosa por renglón." className="sm:col-span-2">
            <textarea id="sv-incluye" rows={4} placeholder={"Diagnóstico de piel\nExtracción\nMáscara hidratante"} value={incluye} onChange={(e) => setIncluye(e.target.value)} className={`${campo} resize-y`} />
          </Campo>

          <Campo label="Profesional a cargo" htmlFor="sv-profesional">
            <input id="sv-profesional" maxLength={100} placeholder="Ej: Daniela P." value={profesional} onChange={(e) => setProfesional(e.target.value)} className={campo} />
          </Campo>

          <Campo label="Sesiones recomendadas" htmlFor="sv-sesiones" ayuda="Dejalo vacío si es de una sola vez.">
            <input id="sv-sesiones" type="number" min={1} max={50} value={sesiones} onChange={(e) => setSesiones(e.target.value)} className={campo} />
          </Campo>

          <Campo label="Etiqueta" htmlFor="sv-etiqueta" ayuda="Los que tienen etiqueta salen destacados en la portada.">
            <select id="sv-etiqueta" value={etiqueta} onChange={(e) => setEtiqueta(e.target.value as ServiceBadge | "")} className={campo}>
              {etiquetas.map((t) => (
                <option key={t.label} value={t.valor}>
                  {t.label}
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Foto (link)" htmlFor="sv-foto" ayuda="El link de una imagen. Sin foto se muestra la inicial del servicio.">
            <input id="sv-foto" type="url" maxLength={500} placeholder="https://…" value={foto} onChange={(e) => setFoto(e.target.value)} className={campo} />
          </Campo>
        </div>
      </Panel>

      {error && (
        <p className="rounded-lg bg-[#fbe4e2] px-4 py-3 text-base text-[#a12b28]" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={guardando} className={`${primaryButtonClass} min-h-12 px-8 text-base`}>
          {guardando ? "Guardando…" : servicio ? "Guardar cambios" : "Agregar servicio"}
        </button>
        <Link to="/servicios" className={`${secondaryButtonClass} min-h-12 px-6 text-base`}>
          Cancelar
        </Link>
      </div>
    </form>
  )
}

function Campo({ label, htmlFor, ayuda, className = "", children }: { label: string; htmlFor: string; ayuda?: string; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className={`${labelClass} text-base`}>
        {label}
      </label>
      {children}
      {ayuda && <p className="mt-1.5 text-sm text-ink-soft">{ayuda}</p>}
    </div>
  )
}

/** Los errores de validación vienen en `detalle`: se muestra el primero, que dice qué campo revisar. */
function mensajeDeError(err: ApiError) {
  const detalle = err.detalle as { campo: string; mensaje: string }[] | undefined
  if (Array.isArray(detalle) && detalle[0]) {
    const campos: Record<string, string> = {
      name: "el nombre",
      category: "la categoría",
      price: "el precio",
      durationMin: "la duración",
      image: "el link de la foto",
      recommendedSessions: "las sesiones recomendadas",
      includes: "qué incluye",
    }
    return `Revisá ${campos[detalle[0].campo.split(".")[0]] ?? "los datos"}: ${detalle[0].mensaje.toLowerCase()}.`
  }
  return err.message
}
