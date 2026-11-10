import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ApiError } from "../../../shared/lib/api"
import { useNegocio } from "../../../shared/lib/negocio"
import { crearPedido, linkDePago, problemasDeCompra, type PedidoCreado } from "../api/checkout.api"
import { useEnvioDelCheckout } from "../api/envios.api"
import PedidoConfirmado from "../components/PedidoConfirmado"
import ResumenDelCarrito from "../components/ResumenDelCarrito"
import SeccionEntrega, { Field, inputClass, type Direccion, type TipoEntrega } from "../components/SeccionEntrega"
import { useCart } from "../lib/carrito"


const textoDelBoton = (enviando: boolean, faltaEnvio: boolean, conMercadoPago: boolean) => {
  if (enviando) return "Confirmando…"
  if (faltaEnvio) return "Falta calcular el envío"
  return conMercadoPago ? "Confirmar y pagar" : "Confirmar pedido"
}

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCart()
  const negocio = useNegocio()
  const navigate = useNavigate()
  const conMercadoPago = negocio?.mercadoPago ?? false

  const [cliente, setCliente] = useState({ nombre: "", apellido: "", telefono: "", email: "" })
  const [entrega, setEntrega] = useState<TipoEntrega>("retiro")
  const [direccion, setDireccion] = useState<Direccion>({ calle: "", ciudad: "", provincia: "", codigoPostal: "" })
  const [comentario, setComentario] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<{ mensaje: string; lista?: string[] } | null>(null)
  const [pedido, setPedido] = useState<PedidoCreado | null>(null)

  // El envío se cotiza apenas hay un código postal válido. El backend lo vuelve a calcular al comprar.
  const conEnvio = entrega === "envio"
  const envio = useEnvioDelCheckout(conEnvio, direccion.codigoPostal, items.reduce((n, i) => n + i.quantity, 0), subtotal)

  const irAPagar = async (token: string) => {
    try {
      window.location.assign((await linkDePago(token)).link)
    } catch {
      navigate(`/pedido/pago?t=${token}`)
    }
  }

  const confirmar = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      const creado = await crearPedido({
        cliente: {
          nombre: cliente.nombre.trim(),
          telefono: cliente.telefono.trim(),
          ...(cliente.apellido.trim() ? { apellido: cliente.apellido.trim() } : {}),
          ...(cliente.email.trim() ? { email: cliente.email.trim() } : {}),
        },
        items: items.map((i) => ({ productoId: i.product.id, cantidad: i.quantity })),
        ...(comentario.trim() ? { notas: comentario.trim() } : {}),
        entrega: conEnvio ? { tipo: "envio", ...direccion, codigoPostal: envio.cp ?? direccion.codigoPostal } : { tipo: "retiro" },
      })
      clear()
      if (creado.pagoToken) {
        // Con Mercado Pago: a pagar. Si no se puede abrir, la pantalla del pago deja reintentar.
        await irAPagar(creado.pagoToken)
        return
      }
      setPedido(creado)
      window.scrollTo(0, 0)
    } catch (err) {
      const problemas = problemasDeCompra(err)
      if (problemas) {
        const nombre = (id: number) => items.find((i) => i.product.id === id)?.product.nombre ?? `Producto ${id}`
        setError({
          mensaje: "Algunos productos ya no se pueden comprar. Ajustá el carrito y volvé a intentar:",
          lista: problemas.map((p) => `${nombre(p.productoId)}: ${p.motivo}`),
        })
      } else {
        setError({ mensaje: err instanceof ApiError ? err.message : "Ocurrió un error inesperado. Probá de nuevo." })
      }
    } finally {
      setEnviando(false)
    }
  }

  if (pedido) return <PedidoConfirmado pedido={pedido} telefono={cliente.telefono} whatsapp={negocio?.telefono ?? ""} />

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-semibold text-ink">Tu carrito está vacío</h1>
        <Link
          to="/tienda"
          className="mt-6 inline-block rounded-sm bg-forest px-7 py-3 text-sm font-medium text-cream transition hover:bg-forest-soft"
        >
          Ir a la tienda
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-8 font-display text-3xl font-semibold text-ink">Checkout</h1>

      <form onSubmit={confirmar} className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section className="rounded-lg border border-cream-dark bg-surface p-6">
            <h2 className="font-display text-lg font-semibold text-ink">1. Tus datos</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nombre *">
                <input
                  required
                  maxLength={100}
                  autoComplete="given-name"
                  value={cliente.nombre}
                  onChange={(e) => setCliente({ ...cliente, nombre: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Apellido">
                <input
                  maxLength={100}
                  autoComplete="family-name"
                  value={cliente.apellido}
                  onChange={(e) => setCliente({ ...cliente, apellido: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="WhatsApp *">
                <input
                  required
                  type="tel"
                  minLength={6}
                  maxLength={30}
                  autoComplete="tel"
                  placeholder="223 15 123-4567"
                  value={cliente.telefono}
                  onChange={(e) => setCliente({ ...cliente, telefono: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  maxLength={150}
                  autoComplete="email"
                  value={cliente.email}
                  onChange={(e) => setCliente({ ...cliente, email: e.target.value })}
                  className={inputClass}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-lg border border-cream-dark bg-surface p-6">
            <h2 className="font-display text-lg font-semibold text-ink">2. Entrega</h2>
            <SeccionEntrega
              enviosHabilitados={negocio?.envios ?? false}
              entrega={entrega}
              onEntrega={setEntrega}
              direccion={direccion}
              onDireccion={setDireccion}
              cpCompleto={envio.cp !== null}
              cotizacion={envio.cotizacion}
            />

            <div className="mt-4">
              <Field label="Comentarios (opcional)">
                <textarea
                  rows={3}
                  maxLength={600}
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-lg border border-cream-dark bg-surface p-6">
            <h2 className="font-display text-lg font-semibold text-ink">3. Pago</h2>
            <p className="mt-3 text-sm text-ink-soft">
              {conMercadoPago
                ? "Al confirmar te llevamos a Mercado Pago para pagar con tarjeta, dinero en cuenta u otros medios. Cuando se apruebe el pago, tu pedido queda confirmado."
                : "Después de confirmar te escribimos por WhatsApp para coordinar el pago (transferencia, efectivo al retirar o link de pago)."}
            </p>
          </section>
        </div>

        <div className="h-fit rounded-lg border border-cream-dark bg-surface p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Resumen del pedido</h2>

          <ResumenDelCarrito items={items} subtotal={subtotal} retira={!conEnvio} envio={envio.costo} />

          {error && (
            <div role="alert" className="mt-5 rounded-md border border-rose/40 bg-rose/10 p-3 text-sm text-ink">
              <p>{error.mensaje}</p>
              {error.lista && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">
                  {error.lista.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={enviando || envio.falta}
            className="mt-6 w-full rounded-sm bg-forest py-3 text-center text-sm font-medium text-cream transition hover:bg-forest-soft disabled:cursor-wait disabled:opacity-60"
          >
            {textoDelBoton(enviando, envio.falta, conMercadoPago)}
          </button>

          <Link to="/carrito" className="mt-4 block text-center text-sm text-leaf hover:underline">
            ← Volver al carrito
          </Link>
        </div>
      </form>
    </div>
  )
}
