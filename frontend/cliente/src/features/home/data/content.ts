/** Textos fijos de la portada. Los productos y servicios destacados salen de ecommerce y turnera. */

/** Fotos del consultorio que pasó la dueña (en public/fotos). */
export const heroImages = {
  background: "/fotos/consultorio/sala-plantas.jpg",
  arch: "/fotos/tratamiento-facial.jpg",
  cta: "/fotos/consultorio/ambiente.jpg",
}

/** "Detrás de DPPUNTOBELLEZA": el texto de la dueña, completo y en su orden. */
export const about = {
  image: "/fotos/daniela.jpg",
  since: { value: "2001", label: "En el mundo de la belleza" },
  title: "Detrás de DPPUNTOBELLEZA",
  // Su subtítulo, "Una pasión que se convirtió en mi profesión.", es el título de la sección (HomePage).
  /** Los primeros se ven siempre; el resto se despliega con "Leer la historia completa". */
  intro: [
    "Mi interés por la piel y el mundo de la belleza comenzó desde muy joven. En 2001 inicié mi camino como consultora de belleza independiente, una experiencia que despertó aún más mi interés por el cuidado personal y me impulsó a seguir aprendiendo, creciendo y formándome profesionalmente.",
    "Con los años, ese interés se transformó en un proyecto que hoy es parte fundamental de mi vida: DPPUNTOBELLEZA.",
  ],
  more: [
    "A lo largo de los últimos seis años, fui desarrollando mi actividad profesional en el ámbito de la estética, sumando experiencia, conocimientos y nuevas formaciones que me permitieron ampliar mi mirada sobre el cuidado de la piel y el bienestar.",
    "Cada etapa de este recorrido me aportó nuevas herramientas y fortaleció mi deseo de seguir creciendo profesionalmente. Así fui construyendo una formación que hoy reúne distintas áreas de la estética y el bienestar: soy dermatocosmiatra, esteticista, cosmetóloga, cosmiatra, linfoterapeuta y masajista profesional.",
    "Mi preparación incluye también bioseguridad, fundamental para promover prácticas responsables y cuidadosas. A lo largo de este camino, instituciones como OMNIA, SALUTARIS —Capacitación en Salud y Estética— y EDDIS Centro Educativo fueron parte de mi formación, aportándome conocimientos que hoy forman parte de mi trabajo cotidiano.",
    "Creo que cada piel tiene sus propias necesidades y que detrás de cada tratamiento debe haber conocimiento, evaluación y un enfoque personalizado. Por eso, considero fundamental unir la preparación profesional con la escucha, la responsabilidad y la atención individualizada, para ofrecer a cada persona un cuidado acorde a sus necesidades.",
    "En marzo de 2025 nació DPPUNTOBELLEZA, un proyecto propio que reúne mi trayectoria, mi formación y mi manera de entender la estética. Hoy, desde mi propio consultorio, continúo desarrollando este espacio con el propósito de brindar una atención cercana, profesional y consciente.",
    "Además del trabajo en el consultorio, DPPUNTOBELLEZA ofrece una selección de productos para el cuidado domiciliario, porque creo que acompañar la piel también significa orientar, asesorar y ayudar a construir hábitos que perduren en el tiempo.",
    "Mi deseo es que cada persona encuentre en este espacio mucho más que un tratamiento o un producto: un lugar de confianza, dedicación y cuidado.",
    "DPPUNTOBELLEZA es el resultado de una pasión que comenzó hace muchos años y que continúa creciendo con el mismo compromiso: cuidar la piel, acompañar a las personas y entender la belleza desde una mirada integral.",
  ],
  titles: ["Dermatocosmiatra", "Esteticista", "Cosmetóloga", "Cosmiatra", "Linfoterapeuta", "Masajista profesional"],
}

export const reasons = [
  {
    title: "Formación integral",
    description: "Dermatocosmiatra, esteticista, cosmetóloga, cosmiatra, linfoterapeuta y masajista profesional.",
  },
  {
    title: "Atención personalizada",
    description: "Cada piel tiene sus necesidades: evaluación y un tratamiento pensado para vos.",
  },
  {
    title: "Bioseguridad",
    description: "Prácticas responsables y cuidadosas en cada tratamiento.",
  },
  {
    title: "Cuidado en casa",
    description: "Productos seleccionados y asesoramiento para construir hábitos que perduren.",
  },
]

/** Fotos para "Conocé el consultorio". La primera ocupa el lugar grande. */
export const gallery = [
  { src: "/fotos/consultorio/recepcion.jpg", alt: "Recepción del consultorio con la pared verde oliva" },
  { src: "/fotos/consultorio/sala-facial.jpg", alt: "Sala de tratamientos faciales con la camilla y el estante de productos" },
  { src: "/fotos/consultorio/aparatologia.jpg", alt: "Sala de aparatología" },
  { src: "/fotos/consultorio/buda.jpg", alt: "Detalle de la sala de espera" },
]

/** Marcas que vende en la tienda. */
export const brands = ["Lidherma", "Carthage", "Mary Kay"]

export const bookingSteps = [
  { title: "Elegí el servicio", description: "Mirá precios, duración y qué incluye cada tratamiento." },
  { title: "Elegí día y horario", description: "Ves la disponibilidad real de la agenda." },
  { title: "Confirmá tus datos", description: "Completás nombre y contacto, y tu turno queda reservado." },
]
