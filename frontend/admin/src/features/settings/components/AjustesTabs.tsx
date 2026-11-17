import Pestanas from "../../../shared/components/Pestanas"

/** Ajustes: los datos del local que muestra la web, Mercado Pago, los envíos y la cuenta para entrar al panel. */
export default function AjustesTabs() {
  return (
    <Pestanas
      etiqueta="Secciones de Ajustes"
      pestanas={[
        { to: "/ajustes", end: true, label: "Tu negocio" },
        { to: "/ajustes/mercadopago", label: "Mercado Pago" },
        { to: "/ajustes/envios", label: "Envíos" },
        { to: "/ajustes/cuenta", label: "Tu cuenta" },
      ]}
    />
  )
}
