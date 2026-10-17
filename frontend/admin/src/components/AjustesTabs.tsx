import Pestanas from "./Pestanas"

/** Ajustes: los datos del local que muestra la web, y la cuenta de Mercado Pago. */
export default function AjustesTabs() {
  return (
    <Pestanas
      etiqueta="Secciones de Ajustes"
      pestanas={[
        { to: "/ajustes", end: true, label: "🏠 Tu negocio" },
        { to: "/ajustes/mercadopago", label: "💳 Mercado Pago" },
      ]}
    />
  )
}
