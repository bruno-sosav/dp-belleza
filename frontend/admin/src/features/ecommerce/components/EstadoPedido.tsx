import type { EstadoPedido as Estado, PagoEstado } from "../api/pedidos.api"

const estilos: Record<Estado, { label: string; clase: string }> = {
  pendiente: { label: "Pendiente", clase: "bg-amber-100 text-amber-900" },
  confirmado: { label: "Confirmado", clase: "bg-rose/25 text-rose-dark" },
  entregado: { label: "Entregado", clase: "bg-emerald-100 text-emerald-900" },
  cancelado: { label: "Cancelado", clase: "bg-cream-dark text-ink-soft" },
}

/** El estado del pedido y, si cobra por Mercado Pago, cómo va el pago. */
export default function EstadoPedido({ estado, pagoEstado }: { estado: Estado; pagoEstado: PagoEstado }) {
  const e = estilos[estado]
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${e.clase}`}>{e.label}</span>
      {pagoEstado === "pagado" && <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-900">Pagado · MP</span>}
      {pagoEstado === "pendiente" && estado !== "cancelado" && (
        <span className="rounded-full border border-dashed border-ink/30 px-2.5 py-1 text-xs text-ink-soft">Esperando pago</span>
      )}
    </span>
  )
}
