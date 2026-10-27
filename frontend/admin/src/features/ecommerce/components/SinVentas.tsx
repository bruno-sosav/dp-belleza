import Panel from "../../../shared/components/Panel"
import { Cargando, ErrorCarga } from "../../../shared/components/EstadoCarga"
import type { RankingApi } from "../../analytics/api/estadisticas.api"
import { useProductosAdmin } from "../api/catalogo.api"

/** Productos activos que no aparecen en el ranking del período. `vendidos` null mientras carga el ranking. */
export default function SinVentas({ vendidos }: { vendidos: RankingApi[] | null }) {
  const productos = useProductosAdmin()
  const vendidosIds = new Set((vendidos ?? []).map((r) => r.id))
  const sinVentas = (productos.datos ?? []).filter((p) => p.activo && !vendidosIds.has(p.id))

  return (
    <Panel title="Sin ventas" description="Productos activos que no se vendieron en el período.">
      {productos.cargando || !vendidos ? (
        <Cargando alto="h-24" />
      ) : productos.error ? (
        <ErrorCarga mensaje={productos.error} onReintentar={productos.recargar} alto="h-24" />
      ) : sinVentas.length === 0 ? (
        <p className="text-sm text-ink-soft">Todos los productos activos tuvieron al menos una venta.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {sinVentas.map((p) => (
            <li key={p.id} className="flex items-center gap-3">
              {p.imagenUrl ? (
                <img src={p.imagenUrl} alt="" className="h-9 w-8 shrink-0 rounded object-cover" />
              ) : (
                <div className="h-9 w-8 shrink-0 rounded bg-cream-dark" />
              )}
              <span className="truncate text-ink">{p.nombre}</span>
              <span className="ml-auto shrink-0 text-xs text-ink-soft">{p.stock} u.</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
