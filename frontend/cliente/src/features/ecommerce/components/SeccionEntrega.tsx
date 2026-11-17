import type { ReactNode } from "react"
import { formatPrice } from "@dp/shared/lib/format"
import { PROVINCIAS, type Cotizacion } from "../api/envios.api"

export type TipoEntrega = "retiro" | "envio"
export type Direccion = { calle: string; ciudad: string; provincia: string; codigoPostal: string }

export const inputClass = "w-full rounded-md border border-cream-dark bg-surface px-3 py-2.5 text-sm outline-none focus:border-ink"

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-ink-soft">{label}</span>
      {children}
    </label>
  )
}

type EstadoCotizacion = { data: Cotizacion | null; loading: boolean; error: string | null }

/** Lo que se le dice a la clienta del costo del envío, según cómo va la cotización. */
function textoCotizacion(cpCompleto: boolean, c: EstadoCotizacion): string {
  if (!cpCompleto) return "Ingresá el código postal para ver el costo del envío."
  if (c.loading) return "Calculando el envío…"
  if (c.error || !c.data) return c.error ?? "No pudimos calcular el envío."
  if (c.data.gratis) return "¡El envío es gratis!"
  const plazo = c.data.plazoDias ? ` · llega en unos ${c.data.plazoDias} días hábiles` : ""
  return `Envío por Andreani: ${formatPrice(c.data.costo)}${plazo}${c.data.prueba ? " (tarifa de prueba)" : ""}`
}

/** Retiro en el local o envío por Andreani, con la dirección y el costo cotizado. */
export default function SeccionEntrega(props: {
  enviosHabilitados: boolean
  entrega: TipoEntrega
  onEntrega: (t: TipoEntrega) => void
  direccion: Direccion
  onDireccion: (d: Direccion) => void
  cpCompleto: boolean
  cotizacion: EstadoCotizacion
}) {
  const { direccion: d, onDireccion } = props
  const opciones = props.enviosHabilitados
    ? ([
        ["retiro", "Retiro en el local"],
        ["envio", "Envío a domicilio"],
      ] as const)
    : ([["retiro", "Retiro en el local"]] as const)

  return (
    <>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {opciones.map(([valor, texto]) => (
          <label key={valor} className="flex cursor-pointer items-center gap-3 rounded-md border border-cream-dark px-4 py-3 text-sm has-[:checked]:border-ink">
            <input type="radio" name="entrega" checked={props.entrega === valor} onChange={() => props.onEntrega(valor)} className="accent-ink" />
            {texto}
          </label>
        ))}
      </div>
      {!props.enviosHabilitados && <p className="mt-3 text-xs text-ink-soft">Por ahora los pedidos se retiran en el local.</p>}

      {props.entrega === "envio" && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Calle, número, piso y depto *">
              <input required minLength={3} maxLength={200} autoComplete="street-address" value={d.calle} onChange={(e) => onDireccion({ ...d, calle: e.target.value })} className={inputClass} />
            </Field>
          </div>
          <Field label="Ciudad *">
            <input required minLength={2} maxLength={100} autoComplete="address-level2" value={d.ciudad} onChange={(e) => onDireccion({ ...d, ciudad: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Provincia *">
            <select required value={d.provincia} onChange={(e) => onDireccion({ ...d, provincia: e.target.value })} className={inputClass}>
              <option value="">Elegí…</option>
              {PROVINCIAS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label="Código postal *">
            <input required maxLength={10} autoComplete="postal-code" placeholder="7600" value={d.codigoPostal} onChange={(e) => onDireccion({ ...d, codigoPostal: e.target.value })} className={inputClass} />
          </Field>
          <p role="status" className="self-end pb-2.5 text-sm text-ink">
            {textoCotizacion(props.cpCompleto, props.cotizacion)}
          </p>
        </div>
      )}
    </>
  )
}
