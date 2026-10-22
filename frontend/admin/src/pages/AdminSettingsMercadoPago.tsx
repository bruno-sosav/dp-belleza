import PageHeader from "../shared/components/PageHeader"
import AjustesTabs from "../components/AjustesTabs"
import PanelMercadoPago from "../components/PanelMercadoPago"
import SenaTurnos from "../components/ajustes/SenaTurnos"
import { useMercadoPago } from "../data/mercadopago"

/**
 * Ajustes → Mercado Pago (/ajustes/mercadopago): conectar la cuenta del local
 * y elegir la seña que se cobra al reservar desde la web.
 */
export default function AdminSettingsMercadoPago() {
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
