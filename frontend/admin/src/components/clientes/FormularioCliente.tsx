import { useState } from "react"
import type { FormEvent } from "react"
import { ApiError } from "../../lib/api"
import { formatTelefono } from "../../lib/format"
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "../../lib/styles"
import { actualizarCliente, crearCliente } from "../../data/clientes"
import type { Cliente } from "../../data/clientes"

/**
 * Formulario de una clienta: sirve para darla de alta (sin `cliente`) o para
 * corregir sus datos (con `cliente`).
 *
 * El teléfono es lo que identifica a la clienta (con él se la encuentra cuando
 * vuelve a reservar o compra), así que el backend lo normaliza y no deja poner
 * uno que ya tenga otra persona.
 */
export default function FormularioCliente({
  cliente,
  onGuardado,
  onCancelar,
}: {
  /** Sin clienta, el formulario da de alta una nueva. */
  cliente?: Cliente
  onGuardado: (cliente: Cliente) => void
  onCancelar: () => void
}) {
  const [nombre, setNombre] = useState(cliente?.nombre ?? "")
  const [apellido, setApellido] = useState(cliente?.apellido ?? "")
  const [telefono, setTelefono] = useState(cliente ? formatTelefono(cliente.telefono) : "")
  const [email, setEmail] = useState(cliente?.email ?? "")
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    try {
      const datos = {
        nombre: nombre.trim(),
        apellido: apellido.trim() || null,
        telefono: telefono.trim(),
        email: email.trim() || null,
      }
      onGuardado(cliente ? await actualizarCliente(cliente.id, datos) : await crearCliente(datos))
    } catch (err) {
      setError(err instanceof ApiError ? mensajeDeError(err) : "No se pudieron guardar los cambios.")
    } finally {
      setGuardando(false)
    }
  }

  const campo = `${inputClass} py-3 text-base`

  return (
    <form onSubmit={guardar} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cli-nombre" className={`${labelClass} text-base`}>Nombre</label>
          <input id="cli-nombre" required autoFocus={!cliente} maxLength={100} value={nombre} onChange={(e) => setNombre(e.target.value)} className={campo} />
        </div>
        <div>
          <label htmlFor="cli-apellido" className={`${labelClass} text-base`}>Apellido</label>
          <input id="cli-apellido" maxLength={100} value={apellido} onChange={(e) => setApellido(e.target.value)} className={campo} />
        </div>
        <div>
          <label htmlFor="cli-telefono" className={`${labelClass} text-base`}>Teléfono (WhatsApp)</label>
          <input id="cli-telefono" required type="tel" inputMode="tel" placeholder="Ej: 223 555-1234" value={telefono} onChange={(e) => setTelefono(e.target.value)} className={campo} />
        </div>
        <div>
          <label htmlFor="cli-email" className={`${labelClass} text-base`}>Email <span className="font-normal text-ink-soft">(opcional)</span></label>
          <input id="cli-email" type="email" maxLength={150} value={email} onChange={(e) => setEmail(e.target.value)} className={campo} />
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-[#fbe4e2] px-3 py-2 text-base text-[#a12b28]" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={guardando} className={`${primaryButtonClass} min-h-12 px-6 text-base`}>
          {guardando ? "Guardando…" : cliente ? "Guardar cambios" : "Agregar clienta"}
        </button>
        <button type="button" onClick={onCancelar} className={`${secondaryButtonClass} min-h-12 px-6 text-base`}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

/** Los errores de validación de zod vienen en `detalle`; se muestra el primero, que es más claro que "Datos inválidos". */
function mensajeDeError(err: ApiError) {
  const detalle = err.detalle as { campo: string; mensaje: string }[] | undefined
  if (Array.isArray(detalle) && detalle[0]) {
    const campos: Record<string, string> = { nombre: "el nombre", telefono: "el teléfono", email: "el email", apellido: "el apellido" }
    return `Revisá ${campos[detalle[0].campo] ?? "los datos"}: ${detalle[0].mensaje.toLowerCase()}.`
  }
  return err.message
}
