import PageHeader from "../components/PageHeader"
import AjustesTabs from "../components/AjustesTabs"
import PanelMercadoPago from "../components/PanelMercadoPago"

/** Ajustes → Mercado Pago (/ajustes/mercadopago): conectar la cuenta del local para cobrar online. */
export default function AdminSettingsMercadoPago() {
  return (
    <div>
      <PageHeader title="Ajustes" description="Conectá la cuenta de Mercado Pago del local para cobrar online." withPeriod={false} action={<AjustesTabs />} />
      <PanelMercadoPago />
    </div>
  )
}
