/**
 * Textos fijos de la landing. Los productos y servicios destacados no viven acá:
 * se leen de ecommerce/data y turnera/data para que la landing siempre muestre
 * lo mismo que la tienda y la turnera.
 */

export const pillars = [
  {
    eyebrow: "Estética",
    title: "Tratamientos y turnos online",
    description:
      "Masajes, faciales, tratamientos corporales, manos y pies, depilación, pestañas y cejas. Elegí el servicio, el día y el horario, y reservá en menos de un minuto.",
    bullets: ["Profesionales especializadas", "Agenda online las 24 hs", "Confirmación inmediata"],
    cta: { to: "/servicios", label: "Reservar un turno" },
    image: "https://picsum.photos/seed/landing-estetica/900/700",
  },
  {
    eyebrow: "Tienda",
    title: "Cosmética y cuidado personal",
    description:
      "Skincare, maquillaje, cabello, perfumes y cuidado corporal. Los mismos productos que usamos en cabina, para que sigas el cuidado en casa.",
    bullets: ["Envío a todo el país", "Pago seguro", "30 días para cambios"],
    cta: { to: "/tienda", label: "Ir a la tienda" },
    image: "https://picsum.photos/seed/landing-tienda/900/700",
  },
]

export const about = {
  image: "https://picsum.photos/seed/about-hero/900/1000",
  paragraphs: [
    "Dp.belleza nació con la idea de acercar tratamientos de estética y cosmética de calidad a cada persona, combinando ingredientes efectivos con fórmulas pensadas para el uso diario. Creemos en una belleza real, sin filtros, que se cuida desde adentro hacia afuera.",
    "Por eso elegimos cada tratamiento y cada producto pensando en su calidad, su origen y su impacto, para que puedas confiar en lo que aplicás sobre tu piel y tu cabello, tanto en cabina como en casa.",
  ],
  values: [
    { title: "Calidad", description: "Ingredientes seleccionados y fórmulas testeadas." },
    { title: "Transparencia", description: "Información clara sobre cada producto y tratamiento." },
    { title: "Comunidad", description: "Escuchamos a quienes nos eligen todos los días." },
  ],
}

export const bookingSteps = [
  { title: "Elegí el servicio", description: "Mirá precios, duración y qué incluye cada tratamiento." },
  { title: "Elegí día y horario", description: "Ves la disponibilidad real de la agenda." },
  { title: "Confirmá tus datos", description: "Completás nombre y contacto, y tu turno queda reservado." },
]

export const stats = [
  { value: "+12k", label: "Clientas felices" },
  { value: "6", label: "Tipos de tratamiento" },
  { value: "4.8/5", label: "Calificación media" },
]

export const testimonials = [
  {
    quote:
      "El masaje descontracturante fue lo mejor que me pasó en el mes. Reservé desde el celular en dos minutos.",
    author: "Lucía F.",
    rating: 5,
  },
  {
    quote:
      "El sérum de vitamina C cambió por completo mi piel en un mes. La textura es liviana y no engrasa.",
    author: "Camila R.",
    rating: 5,
  },
  {
    quote:
      "Pedí el perfume floral y llegó antes de lo esperado, perfecto embalado. Ya es mi fragancia de todos los días.",
    author: "Valentina G.",
    rating: 5,
  },
]

export const contactInfo = {
  address: "Av. Siempre Viva 1234, Buenos Aires",
  email: "hola@dpbelleza.com",
  phone: "+54 11 1234-5678",
  hours: "Lunes a viernes de 9 a 18hs",
}
