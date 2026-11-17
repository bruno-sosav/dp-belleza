import { useState } from "react"
import { formatPrice } from "@dp/shared/lib/format"
import FormCobro from "../../payments/components/FormCobro"
import { inputClass, labelClass, secondaryButtonClass } from "../../../shared/lib/styles"
import { whatsappCliente } from "../../../shared/lib/whatsapp"
import { venderGiftCard, type GiftCard } from "../api/giftCards.api"

const campo = (id: string, label: string, valor: string, cambiar: (v: string) => void, extra: { max: number; placeholder?: string; tel?: boolean }) => (
  <div>
    <label htmlFor={id} className={labelClass}>{label}</label>
    <input
      id={id}
      type={extra.tel ? "tel" : "text"}
      maxLength={extra.max}
      placeholder={extra.placeholder}
      value={valor}
      onChange={(e) => cambiar(e.target.value)}
      className={inputClass}
    />
  </div>
)

/** Vender una gift card en el local: quién la compra, para quién, y el cobro (monto y medio). Al final, el código. */
export default function VenderGiftCard({ onVendida, onCerrar }: { onVendida: () => void; onCerrar: () => void }) {
  const [datos, setDatos] = useState({ nombre: "", telefono: "", para: "", mensaje: "" })
  const [vendida, setVendida] = useState<GiftCard | null>(null)

  if (vendida) {
    const texto = `¡Hola${vendida.para ? ` ${vendida.para}` : ""}! Te regalaron una gift card de DP Belleza por ${formatPrice(vendida.monto)}. Tu código es ${vendida.codigo}.`
    return (
      <div className="rounded-xl border border-cream-dark bg-cream p-5 text-center">
        <p className="text-base text-ink-soft">Gift card de {formatPrice(vendida.monto)} lista. El código es:</p>
        <p className="mt-2 font-mono text-4xl font-semibold tracking-widest text-ink">{vendida.codigo}</p>
        <p className="mt-2 text-sm text-ink-soft">Anotalo en la tarjeta o mandáselo por WhatsApp. La plata ya figura en la caja de hoy.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {vendida.comprador.telefono && (
            <a href={whatsappCliente(vendida.comprador.telefono, texto)} target="_blank" rel="noreferrer" className={secondaryButtonClass}>
              Mandar por WhatsApp
            </a>
          )}
          <button type="button" onClick={onCerrar} className={secondaryButtonClass}>
            Listo
          </button>
        </div>
      </div>
    )
  }

  const set = (k: keyof typeof datos) => (v: string) => setDatos({ ...datos, [k]: v })
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {campo("gc-nombre", "¿Quién la compra? *", datos.nombre, set("nombre"), { max: 100 })}
        {campo("gc-telefono", "Su WhatsApp", datos.telefono, set("telefono"), { max: 20, placeholder: "223 15 123-4567", tel: true })}
        {campo("gc-para", "¿Para quién es?", datos.para, set("para"), { max: 100 })}
        {campo("gc-mensaje", "Mensaje", datos.mensaje, set("mensaje"), { max: 300, placeholder: "¡Feliz cumple!" })}
      </div>
      <FormCobro
        montoSugerido={0}
        conGiftCard={false}
        textoGuardar="Vender gift card"
        onGuardar={async ({ monto, medio }) => {
          if (!datos.nombre.trim()) throw new Error("Escribí arriba quién la compra.")
          if (medio === "gift_card") throw new Error("Elegí cómo te pagó.")
          const g = await venderGiftCard({
            monto,
            medio,
            comprador: { nombre: datos.nombre.trim(), ...(datos.telefono.trim() ? { telefono: datos.telefono.trim() } : {}) },
            ...(datos.para.trim() ? { para: datos.para.trim() } : {}),
            ...(datos.mensaje.trim() ? { mensaje: datos.mensaje.trim() } : {}),
          })
          setVendida(g)
          onVendida()
        }}
        onCancelar={onCerrar}
      />
    </div>
  )
}
