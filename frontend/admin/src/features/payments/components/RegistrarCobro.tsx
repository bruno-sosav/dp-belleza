import { useState } from "react"
import FormCobro from "./FormCobro"
import { inputClass, labelClass, primaryButtonClass } from "../../../shared/lib/styles"
import { registrarCobro } from "../api/caja.api"

/**
 * Anotar a mano una entrada que no es de un turno (una gift card, un producto
 * vendido en el local…). Los turnos se cobran desde el propio turno (✅
 * Completado) o desde "Sin cobrar".
 */
export default function RegistrarCobro({ onCambio }: { onCambio: () => void }) {
  const [abierto, setAbierto] = useState(false)
  const [descripcion, setDescripcion] = useState("")

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className={`${primaryButtonClass} min-h-12 px-6 text-base`}>
        + Registrar otro cobro
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <div className="max-w-md">
        <label htmlFor="cobro-desc" className={`${labelClass} text-base`}>¿Qué es?</label>
        <input
          id="cobro-desc"
          maxLength={255}
          autoFocus
          placeholder="Ej: gift card, crema vendida en el local"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className={`${inputClass} py-3 text-base`}
        />
      </div>
      <FormCobro
        montoSugerido={0}
        onGuardar={async (cobro) => {
          if (!descripcion.trim()) throw new Error("Contá arriba, en una línea, qué es este cobro.")
          await registrarCobro({ ...cobro, concepto: "otro", descripcion: descripcion.trim() })
          setDescripcion("")
          setAbierto(false)
          onCambio()
        }}
        onCancelar={() => setAbierto(false)}
      />
    </div>
  )
}
