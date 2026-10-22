import PageHeader from "../shared/components/PageHeader"
import Panel from "../shared/components/Panel"
import { Pendiente } from "../shared/components/EstadoCarga"

/**
 * Ventas de la tienda — PENDIENTE DE CONECTAR (módulo de ecommerce).
 *
 * Esta pantalla mostraba ventas por día, ticket promedio y ranking de productos,
 * todo calculado en el navegador sobre 180 días de pedidos inventados. Al pasar
 * las estadísticas a SQL se dejó explícitamente sin conectar, porque mostrarle
 * números falsos a la dueña es peor que no mostrarle nada: no hay forma de que
 * se dé cuenta de que son inventados.
 *
 * La versión con los gráficos armados está en el historial de git (antes del
 * commit que conectó el panel a la API), así que recuperarla es `git show`.
 *
 * Para conectarla hacen falta dos cosas:
 *
 *  1. En `backend/src/admin/stats.ts`, completar el TODO de la query de
 *     `pedidos` y poner `tiendaConectada: true`. Con eso solo ya se encienden
 *     los tiles, el gráfico y el calendario de Finanzas, sin tocar el front.
 *
 *  2. Un endpoint de ranking de productos, por ejemplo
 *     `GET /api/admin/stats/productos?dias=30`, devolviendo
 *     `{ id, name, count, revenue }[]` — la misma forma que
 *     `/stats/servicios`, así entra directo en <RankingList>.
 */
export default function AdminSales() {
  return (
    <div>
      <PageHeader
        title="Ventas tienda"
        description="Cómo viene la tienda: ventas por día, ticket promedio y qué se vende más."
      />

      <Panel className="mt-6">
        <Pendiente alto="h-72">
          <span className="block text-base font-medium text-ink">Pendiente de conectar</span>
          <span className="mt-2 block">
            Las estadísticas de la tienda las conecta el módulo de ecommerce.
          </span>
          <span className="mt-4 block text-xs">
            Falta completar el TODO de <code>backend/src/admin/stats.ts</code> con la query de{" "}
            <code>pedidos</code>, y agregar <code>GET /api/admin/stats/productos</code>.
          </span>
          <span className="mt-4 block text-xs">
            Hasta entonces esta pantalla no muestra nada en vez de mostrar números inventados.
          </span>
        </Pendiente>
      </Panel>
    </div>
  )
}
