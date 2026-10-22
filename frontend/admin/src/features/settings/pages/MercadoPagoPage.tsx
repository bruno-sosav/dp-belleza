import PageHeader from "../../../shared/components/PageHeader"
import AjustesTabs from "../components/AjustesTabs"
import PanelMercadoPago from "../components/PanelMercadoPago"
import SenaTurnos from "../components/SenaTurnos"
import { useMercadoPago } from "../api/mercadopago.api"

/**
 * Ajustes → Mercado Pago (/ajustes/mercadopago): conectar la cuenta del local
 * y elegir la seña que se cobra al reservar desde la web.
 */
export default function MercadoPagoPage() {
  const estado = useMercadoPago()
  return (
    <div>
      <PageHeader title="Ajustes" description="Conectá la cuenta de Mercado Pago del local para cobrar online." withPeriod={false} action={<AjustesTabs />} />
      <div className="space-y-6">
        <PanelMercadoPago estado={estado} />
        <SenaTurnos conectado={estado.datos?.configurada ?? false} />
      </div>
    </div>
  )
}
