import { Link } from "react-router-dom"
import { whatsappUrl } from "../../home/lib/whatsapp"
import type { PedidoCreado } from "../api/checkout.api"
import ResumenDePedido from "./ResumenDePedido"

/** Después de confirmar, cuando no hay que ir a pagar: el número de pedido, qué llevó y cómo sigue. */
export default function PedidoConfirmado({ pedido, telefono, whatsapp }: { pedido: PedidoCreado; telefono: string; whatsapp: string }) {
  const mensaje = `¡Hola! Hice el pedido #${pedido.id} en la tienda online.`
  // Si la gift card cubrió todo, no hay pago que coordinar.
  const pagado = pedido.estado === "confirmado"
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-lg border border-cream-dark bg-surface p-8 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-leaf">Pedido confirmado</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">¡Gracias por tu compra!</h1>
        <p className="mt-3 text-ink-soft">
          Tu pedido es el <strong className="text-ink">#{pedido.id}</strong>.{" "}
          {pagado ? `Lo pagaste con tu gift card. Te vamos a escribir al ${telefono} para coordinar ` : `Te vamos a escribir al ${telefono} para coordinar el pago y `}
          {pedido.envio ? "el envío." : "el retiro."}
        </p>

        <ResumenDePedido items={pedido.items} total={pedido.total} envio={pedido.envio} giftCard={pedido.giftCard} />

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {whatsapp && (
            <a
              href={whatsappUrl(whatsapp, mensaje)}
              target="_blank"
              rel="noreferrer"
              className="rounded-sm bg-forest px-6 py-3 text-sm font-medium text-cream transition hover:bg-forest-soft"
            >
              Escribinos por WhatsApp
            </a>
          )}
          <Link
            to="/tienda"
            className="rounded-sm border border-forest/40 px-6 py-3 text-sm font-medium text-ink transition hover:bg-forest hover:text-cream"
          >
            Seguir comprando
          </Link>
        </div>
      </div>
    </div>
  )
}
