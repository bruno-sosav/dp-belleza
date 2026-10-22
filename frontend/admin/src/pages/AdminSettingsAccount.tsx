import PageHeader from "../shared/components/PageHeader"
import AjustesTabs from "../components/AjustesTabs"
import DatosCuenta from "../components/ajustes/DatosCuenta"
import CambiarContrasena from "../components/ajustes/CambiarContrasena"

/** Ajustes → Tu cuenta (/ajustes/cuenta): con qué nombre, email y contraseña se entra al panel. */
export default function AdminSettingsAccount() {
  return (
    <div>
      <PageHeader title="Ajustes" description="Con qué email y contraseña entrás al panel." withPeriod={false} action={<AjustesTabs />} />
      <div className="space-y-6">
        <DatosCuenta />
        <CambiarContrasena />
      </div>
    </div>
  )
}
