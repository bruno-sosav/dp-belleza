import type { EstadoPedido as Estado, PagoEstado } from "../api/pedidos.api"

const estilos: Record<Estado, { label: string; clase: string }> = {
  pendiente: { label: "Pendiente", clase: "bg-alerta-claro text-alerta" },
  confirmado: { label: "Confirmado", clase: "bg-info-claro text-info" },
  entregado: { label: "Entregado", clase: "bg-exito-claro text-exito" },
  cancelado: { label: "Cancelado", clase: "bg-cream-dark text-ink-soft line-through" },
}

/** El estado del pedido y, si cobra por Mercado Pago, cómo va el pago. */
export default function EstadoPedido({ estado, pagoEstado }: { estado: Estado; pagoEstado: PagoEstado }) {
  const e = estilos[estado]
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className={`rounded-full px-3 py-1 text-sm font-medium ${e.clase}`}>{e.label}</span>
      {pagoEstado === "pagado" && <span className="rounded-full bg-exito-claro px-3 py-1 text-sm font-medium text-exito">Pagado · MP</span>}
      {pagoEstado === "pendiente" && estado !== "cancelado" && (
        <span className="rounded-full border border-dashed border-alerta px-3 py-1 text-sm text-alerta">Esperando pago</span>
      )}
    </span>
  )
}
