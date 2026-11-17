import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { formatPrice, formatTelefono } from "@dp/shared/lib/format"
import Panel from "../../../shared/components/Panel"
import { Cargando, ErrorCarga } from "../../../shared/components/EstadoCarga"
import { formatLongDate } from "../../../shared/lib/format"
import { whatsappCliente } from "../../../shared/lib/whatsapp"
import { nombreCliente, usePedido, type PedidoDetalle } from "../api/pedidos.api"
import AccionesPedido from "../components/AccionesPedido"
import EstadoPedido from "../components/EstadoPedido"
import PanelEnvio from "../components/PanelEnvio"

function textoDelPago(p: PedidoDetalle) {
  const conGiftCard = p.giftCard ? `Usó la gift card ${p.giftCard.codigo} por ${formatPrice(p.giftCard.monto)}. ` : ""
  if (p.giftCard && p.giftCard.monto >= p.total) return `Pagado entero con la gift card ${p.giftCard.codigo}: esa plata entró a la caja cuando se vendió.`
  if (p.pagoEstado === "pagado") return `${conGiftCard}Pagado por Mercado Pago. La plata ya figura en Finanzas → Caja.`
  if (p.pagoEstado === "pendiente") return `${conGiftCard}Esperando el pago de Mercado Pago. Cuando se apruebe, el pedido se confirma solo.`
  return `${conGiftCard}${conGiftCard ? "El resto, a" : "A"} coordinar con la clienta (la tienda no tenía Mercado Pago conectado cuando se hizo el pedido).`
}

/** Un pedido: la clienta, qué llevó, cómo lo quiere recibir, cómo va el pago y los botones para moverlo. */
export default function OrderDetailPage() {
  const id = Number(useParams().id)
  const { datos, cargando, error, recargar } = usePedido(id)
  // Después de cambiar el estado se muestra lo que devolvió el backend, sin volver a pedir.
  const [actualizado, setActualizado] = useState<PedidoDetalle | null>(null)
  const pedido = actualizado?.id === id ? actualizado : datos

  if (!pedido && cargando) return <Cargando alto="h-64" />
  if (!pedido) return <ErrorCarga mensaje={error ?? "No se pudo cargar el pedido."} onReintentar={recargar} alto="h-64" />

  const mensaje = `¡Hola ${pedido.cliente.nombre}! Te escribo por tu pedido #${pedido.id} de la tienda.`

  return (
    <div>
      <Link to="/pedidos" className="text-sm text-ink-soft hover:text-ink">
        ← Volver a pedidos
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">Pedido #{pedido.id}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {formatLongDate(pedido.creadoEn.slice(0, 10))}, {pedido.creadoEn.slice(11, 16)} hs
          </p>
        </div>
        <EstadoPedido estado={pedido.estado} pagoEstado={pedido.pagoEstado} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Panel title="Productos">
            <ul className="divide-y divide-cream-dark text-sm">
              {pedido.items.map((i) => (
                <li key={i.productoId} className="flex items-baseline justify-between gap-4 py-2.5">
                  <span className="text-ink">
                    {i.nombre} <span className="text-ink-soft">× {i.cantidad}</span>
                  </span>
                  <span className="tabular-nums text-ink-soft">{formatPrice(i.subtotal)}</span>
                </li>
              ))}
              {pedido.envio && (
                <li className="flex items-baseline justify-between gap-4 py-2.5">
                  <span className="text-ink">Envío</span>
                  <span className="tabular-nums text-ink-soft">{pedido.envio.costo ? formatPrice(pedido.envio.costo) : "Gratis"}</span>
                </li>
              )}
              {pedido.descuentoCumple > 0 && (
                <li className="flex items-baseline justify-between gap-4 py-2.5">
                  <span className="text-ink">Descuento de cumpleaños</span>
                  <span className="tabular-nums text-ink-soft">− {formatPrice(pedido.descuentoCumple)}</span>
                </li>
              )}
            </ul>
            <div className="mt-2 flex justify-between border-t border-cream-dark pt-3">
              <span className="font-medium text-ink">Total</span>
              <span className="font-display text-lg font-semibold tabular-nums text-ink">{formatPrice(pedido.total)}</span>
            </div>
            {pedido.giftCard && (
              <div className="mt-1 flex justify-between text-sm text-ink-soft">
                <span>Gift card {pedido.giftCard.codigo}</span>
                <span className="tabular-nums">− {formatPrice(pedido.giftCard.monto)}</span>
              </div>
            )}
          </Panel>

          <PanelEnvio pedido={pedido} onCambio={setActualizado} />

          {pedido.notas && (
            <Panel title="Comentarios de la clienta">
              <p className="whitespace-pre-line text-sm text-ink">{pedido.notas}</p>
            </Panel>
          )}

          <Panel title="Pago">
            <p className="text-sm text-ink">{textoDelPago(pedido)}</p>
          </Panel>

          <AccionesPedido pedido={pedido} onCambio={setActualizado} />
        </div>

        <Panel title="Clienta">
          <Link to={`/clientes/${pedido.cliente.id}`} className="font-medium text-ink hover:text-rose-dark">
            {nombreCliente(pedido.cliente)}
          </Link>
          <p className="mt-1 text-sm text-ink-soft">{formatTelefono(pedido.cliente.telefono)}</p>
          {pedido.cliente.email && <p className="text-sm text-ink-soft">{pedido.cliente.email}</p>}
          <a
            href={whatsappCliente(pedido.cliente.telefono, mensaje)}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex rounded-lg bg-forest px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-dark"
          >
            Escribirle por WhatsApp
          </a>
        </Panel>
      </div>
    </div>
  )
}
