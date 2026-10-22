import { useEffect, useState } from "react"
import { ApiError } from "../../shared/lib/api"
import { formatTelefono } from "../../shared/lib/format"
import { inputClass, primaryButtonClass, secondaryButtonClass } from "../../shared/lib/styles"
import { nombreCompleto, unirClientes, useClientes, usePosiblesDuplicados } from "../../data/clientes"
import type { FichaCorta } from "../../data/clientes"

const opcionClass =
  "flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-cream-dark bg-surface px-4 py-3 text-left text-base text-ink transition hover:border-rose-dark hover:bg-rose/10"

/**
 * Unir esta ficha con otra de la misma persona (reservó con dos teléfonos).
 * Esta ficha queda; la otra le pasa sus turnos y compras y se borra.
 *
 * Arriba aparecen las que el sistema cree que son la misma persona; si no
 * está, se busca a mano.
 */
export default function UnirCliente({ cliente, onUnida }: { cliente: FichaCorta; onUnida: () => void }) {
  const [abierto, setAbierto] = useState(false)
  const [otra, setOtra] = useState<FichaCorta | null>(null)
  const [telefonoDe, setTelefonoDe] = useState<"esta" | "otra">("esta")
  const [uniendo, setUniendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<string | null>(null)
  const nombre = nombreCompleto(cliente)

  async function unir() {
    if (!otra) return
    setUniendo(true)
    setError(null)
    try {
      const r = await unirClientes(cliente.id, otra.id, telefonoDe)
      const partes = [r.turnos && `${r.turnos} ${r.turnos === 1 ? "turno" : "turnos"}`, r.compras && `${r.compras} ${r.compras === 1 ? "compra" : "compras"}`].filter(Boolean)
      setResultado(`✅ Listo. Se pasaron ${partes.length ? partes.join(" y ") : "sus datos"} a esta ficha.`)
      setOtra(null)
      setAbierto(false)
      onUnida()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron unir las fichas.")
    } finally {
      setUniendo(false)
    }
  }

  if (!abierto) {
    return (
      <div>
        {resultado && <p className="mb-3 rounded-xl bg-cream-dark px-4 py-3 text-base text-ink" role="status">{resultado}</p>}
        <p className="text-base text-ink-soft">¿{nombre} tiene otra ficha con otro teléfono? Unilas para ver todo su historial junto.</p>
        <button type="button" onClick={() => setAbierto(true)} className={`${secondaryButtonClass} mt-3 min-h-12 px-5 text-base`}>
          Unir con otra ficha
        </button>
      </div>
    )
  }

  if (otra) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-[#e0b44a] bg-[#fdf3dc] p-4 text-base text-ink">
          <p>
            Los turnos y compras de <strong>{nombreCompleto(otra)}</strong> ({formatTelefono(otra.telefono)}) se pasan a esta ficha, y esa ficha se borra.
          </p>
          <p className="mt-1 text-sm text-ink-soft">Los datos que le falten a esta ficha (email, cumpleaños) se completan con los de la otra, y las notas se juntan. No se puede deshacer.</p>
        </div>
        <fieldset>
          <legend className="mb-2 text-base font-medium text-ink">¿Con qué teléfono se queda?</legend>
          <div className="space-y-2">
            {([
              ["esta", cliente.telefono],
              ["otra", otra.telefono],
            ] as const).map(([valor, tel]) => (
              <label key={valor} className={`${opcionClass} cursor-pointer justify-start`}>
                <input type="radio" name="telefono" checked={telefonoDe === valor} onChange={() => setTelefonoDe(valor)} className="h-5 w-5" />
                <span className="tabular-nums">{formatTelefono(tel)}</span>
                <span className="text-ink-soft">{valor === "esta" ? "(el de esta ficha)" : "(el de la otra)"}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {error && (
          <p className="rounded-lg bg-[#fbe4e2] px-3 py-2 text-base text-[#a12b28]" role="alert">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={uniendo} onClick={() => void unir()} className={`${primaryButtonClass} min-h-12 px-6 text-base`}>
            {uniendo ? "Uniendo…" : "Unir fichas"}
          </button>
          <button type="button" disabled={uniendo} onClick={() => setOtra(null)} className={`${secondaryButtonClass} min-h-12 px-6 text-base`}>
            Elegir otra
          </button>
        </div>
      </div>
    )
  }

  return <ElegirOtra cliente={cliente} onElegir={setOtra} onCancelar={() => setAbierto(false)} />
}

function ElegirOtra({ cliente, onElegir, onCancelar }: { cliente: FichaCorta; onElegir: (f: FichaCorta) => void; onCancelar: () => void }) {
  const sugeridas = usePosiblesDuplicados(cliente.id)
  const [texto, setTexto] = useState("")
  const [busqueda, setBusqueda] = useState("")
  useEffect(() => {
    const id = setTimeout(() => setBusqueda(texto.trim()), 300)
    return () => clearTimeout(id)
  }, [texto])
  const encontradas = useClientes(busqueda)

  const fila = (f: FichaCorta) => (
    <button key={f.id} type="button" onClick={() => onElegir(f)} className={opcionClass}>
      <span className="font-semibold">{nombreCompleto(f)}</span>
      <span className="text-ink-soft tabular-nums">{formatTelefono(f.telefono)}</span>
    </button>
  )

  return (
    <div className="space-y-4">
      {(sugeridas.datos?.length ?? 0) > 0 && (
        <div>
          <p className="mb-2 text-base font-medium text-ink">Puede ser la misma persona:</p>
          <div className="space-y-2">{sugeridas.datos!.map(fila)}</div>
        </div>
      )}
      <div>
        <label htmlFor="unir-buscar" className="mb-2 block text-base font-medium text-ink">Buscar la otra ficha</label>
        <input id="unir-buscar" type="search" placeholder="Nombre o teléfono" value={texto} onChange={(e) => setTexto(e.target.value)} className={`${inputClass} py-3 text-base`} />
        {busqueda && (
          <div className="mt-2 space-y-2">
            {(encontradas.datos ?? []).filter((f) => f.id !== cliente.id).slice(0, 6).map(fila)}
            {encontradas.datos && encontradas.datos.filter((f) => f.id !== cliente.id).length === 0 && (
              <p className="px-1 text-base text-ink-soft">No hay otra ficha con “{busqueda}”.</p>
            )}
          </div>
        )}
      </div>
      <button type="button" onClick={onCancelar} className={`${secondaryButtonClass} min-h-12 px-5 text-base`}>
        Cancelar
      </button>
    </div>
  )
}
