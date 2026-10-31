import { useState } from "react"
import { inputClass } from "../../../shared/lib/styles"
import type { ProductoAdmin } from "../api/catalogo.api"
import { ajustarStock } from "../api/inventario.api"
import { mensajeDe } from "../lib/errores"

/** El stock de un producto, con un botón para corregirlo (lo que se contó en el local). */
export default function StockEditable({ producto, onCambio }: { producto: ProductoAdmin; onCambio: () => void }) {
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState(String(producto.stock))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const guardar = async () => {
    setGuardando(true)
    setError(null)
    try {
      await ajustarStock(producto.id, Number(valor))
      setEditando(false)
      onCambio()
    } catch (err) {
      setError(mensajeDe(err))
    } finally {
      setGuardando(false)
    }
  }

  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => {
          setValor(String(producto.stock))
          setEditando(true)
        }}
        title="Corregir el stock"
        className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition hover:ring-1 hover:ring-ink/30 ${
          producto.stock === 0 ? "bg-red-50 text-red-700" : "bg-cream-dark text-ink"
        }`}
      >
        {producto.stock === 0 ? "Sin stock" : `${producto.stock} u.`}
      </button>
    )
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={0}
          step={1}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          aria-label={`Stock de ${producto.nombre}`}
          className={`${inputClass} w-20 py-1 text-sm`}
          autoFocus
        />
        <button type="button" onClick={() => setEditando(false)} className="px-2 py-1 text-xs text-ink-soft hover:text-ink">
          Cancelar
        </button>
        <button
          type="button"
          disabled={guardando || valor === "" || !Number.isInteger(Number(valor)) || Number(valor) < 0}
          onClick={guardar}
          className="rounded-lg bg-ink px-2.5 py-1 text-xs font-medium text-cream disabled:opacity-50"
        >
          Guardar
        </button>
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  )
}
