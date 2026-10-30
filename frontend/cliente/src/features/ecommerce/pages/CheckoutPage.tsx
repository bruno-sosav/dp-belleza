import { useState, type FormEvent, type ReactNode } from "react"
import { Link, useNavigate } from "react-router-dom"
import { formatPrice } from "@dp/shared/lib/format"
import { ApiError } from "../../../shared/lib/api"
import { useNegocio } from "../../../shared/lib/negocio"
import { whatsappUrl } from "../../home/lib/whatsapp"
import { crearPedido, linkDePago, problemasDeCompra, type PedidoCreado } from "../api/checkout.api"
import ProductImage from "../components/ProductImage"
import ResumenDePedido from "../components/ResumenDePedido"
import { useCart } from "../context/CartContext"

type Entrega = "retiro" | "envio"

const inputClass = "w-full rounded-md border border-cream-dark bg-surface px-3 py-2.5 text-sm outline-none focus:border-ink"

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-ink-soft">{label}</span>
      {children}
    </label>
  )
}

/**
 * La tabla `pedidos` todavía no tiene columnas de entrega: la forma de entrega
 * y la dirección viajan en `notas`, que la dueña ve en el panel.
 */
function armarNotas(entrega: Entrega, direccion: { calle: string; ciudad: string; cp: string }, comentario: string) {
  const lineas = [
    entrega === "retiro"
      ? "Entrega: retira en el local."
      : `Entrega: envío a domicilio — ${direccion.calle}, ${direccion.ciudad}${direccion.cp ? ` (CP ${direccion.cp})` : ""}.`,
  ]
  if (comentario.trim()) lineas.push(`Comentario: ${comentario.trim()}`)
  return lineas.join("\n")
}

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCart()
  const negocio = useNegocio()
  const navigate = useNavigate()
  const conMercadoPago = negocio?.mercadoPago ?? false

  const [cliente, setCliente] = useState({ nombre: "", apellido: "", telefono: "", email: "" })
  const [entrega, setEntrega] = useState<Entrega>("retiro")
  const [direccion, setDireccion] = useState({ calle: "", ciudad: "", cp: "" })
  const [comentario, setComentario] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<{ mensaje: string; lista?: string[] } | null>(null)
  const [pedido, setPedido] = useState<PedidoCreado | null>(null)

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
        notas: armarNotas(entrega, direccion, comentario),
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

  if (pedido) {
    const mensaje = `¡Hola! Hice el pedido #${pedido.id} en la tienda online.`
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-cream-dark bg-surface p-8 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-rose-dark">Pedido confirmado</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink">¡Gracias por tu compra!</h1>
          <p className="mt-3 text-ink-soft">
            Tu pedido es el <strong className="text-ink">#{pedido.id}</strong>. Te vamos a escribir al {cliente.telefono} para coordinar el pago y
            la entrega.
          </p>

          <ResumenDePedido items={pedido.items} total={pedido.total} />

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {negocio?.telefono && (
              <a
                href={whatsappUrl(negocio.telefono, mensaje)}
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-ink px-6 py-3 text-sm font-medium text-cream transition hover:bg-rose-dark"
              >
                Escribinos por WhatsApp
              </a>
            )}
            <Link
              to="/tienda"
              className="rounded-md border border-ink px-6 py-3 text-sm font-medium text-ink transition hover:bg-ink hover:text-cream"
            >
              Seguir comprando
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-semibold text-ink">Tu carrito está vacío</h1>
        <Link
          to="/tienda"
          className="mt-6 inline-block rounded-md bg-ink px-7 py-3 text-sm font-medium text-cream transition hover:bg-rose-dark"
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
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(
                [
                  ["retiro", "Retiro en el local"],
                  ["envio", "Envío a domicilio"],
                ] as const
              ).map(([valor, texto]) => (
                <label
                  key={valor}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-cream-dark px-4 py-3 text-sm has-[:checked]:border-ink"
                >
                  <input
                    type="radio"
                    name="entrega"
                    checked={entrega === valor}
                    onChange={() => setEntrega(valor)}
                    className="accent-ink"
                  />
                  {texto}
                </label>
              ))}
            </div>

            {entrega === "envio" && (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Calle y número *">
                    <input
                      required
                      maxLength={200}
                      autoComplete="street-address"
                      value={direccion.calle}
                      onChange={(e) => setDireccion({ ...direccion, calle: e.target.value })}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <Field label="Ciudad *">
                  <input
                    required
                    maxLength={100}
                    autoComplete="address-level2"
                    value={direccion.ciudad}
                    onChange={(e) => setDireccion({ ...direccion, ciudad: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Código postal">
                  <input
                    maxLength={10}
                    autoComplete="postal-code"
                    value={direccion.cp}
                    onChange={(e) => setDireccion({ ...direccion, cp: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <p className="text-xs text-ink-soft sm:col-span-2">El costo del envío te lo confirmamos por WhatsApp.</p>
              </div>
            )}

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

          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <li key={item.product.id} className="flex items-center gap-3">
                <ProductImage
                  src={item.product.imagenUrl}
                  alt={item.product.nombre}
                  className="h-14 w-11 shrink-0 rounded text-[9px]"
                />
                <div className="flex-1">
                  <p className="text-sm text-ink">{item.product.nombre}</p>
                  <p className="text-xs text-ink-soft">Cant. {item.quantity}</p>
                </div>
                <span className="text-sm text-ink-soft">{formatPrice(item.product.precio * item.quantity)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 space-y-2 border-t border-cream-dark pt-4 text-sm">
            <div className="flex justify-between text-ink-soft">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-ink-soft">
              <span>Envío</span>
              <span>{entrega === "retiro" ? "Sin cargo" : "A coordinar"}</span>
            </div>
          </div>

          <div className="mt-4 flex justify-between border-t border-cream-dark pt-4">
            <span className="font-display font-semibold text-ink">Total</span>
            <span className="font-display text-lg font-semibold text-ink">{formatPrice(subtotal)}</span>
          </div>

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
            disabled={enviando}
            className="mt-6 w-full rounded-md bg-ink py-3 text-center text-sm font-medium text-cream transition hover:bg-rose-dark disabled:cursor-wait disabled:opacity-60"
          >
            {enviando ? "Confirmando…" : conMercadoPago ? "Confirmar y pagar" : "Confirmar pedido"}
          </button>

          <Link to="/carrito" className="mt-4 block text-center text-sm text-rose-dark hover:underline">
            ← Volver al carrito
          </Link>
        </div>
      </form>
    </div>
  )
}
