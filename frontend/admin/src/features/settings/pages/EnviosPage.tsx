import PageHeader from "../../../shared/components/PageHeader"
import AjustesTabs from "../components/AjustesTabs"
import AjustesEnvios from "../components/AjustesEnvios"
import CuentaAndreani from "../components/CuentaAndreani"
import { useCuentaAndreani } from "../api/andreani.api"

/** Ajustes → Envíos: cómo envía la tienda y la cuenta de Andreani. */
export default function EnviosPage() {
  const cuenta = useCuentaAndreani()
  return (
    <div>
      <PageHeader title="Ajustes" description="Envíos a domicilio de la tienda online, con Andreani." withPeriod={false} action={<AjustesTabs />} />
      <div className="space-y-6">
        <AjustesEnvios cuentaCargada={Boolean(cuenta.datos)} />
        <CuentaAndreani estado={cuenta} />
      </div>
    </div>
  )
}
