/**
 * MOCK DATA — Servicios de la estética.
 *
 * Estos tipos son la forma que el frontend espera del backend de turnera.
 * Si cambian acá, cambian en la API. Tratarlos como contrato, no como relleno.
 */

export type ServiceCategory =
  | "Masajes"
  | "Facial"
  | "Corporal"
  | "Manos y Pies"
  | "Depilación"
  | "Pestañas y Cejas"

export type ServiceBadge = "Nuevo" | "Más elegido" | "Promo"

export type Service = {
  id: string
  name: string
  category: ServiceCategory
  /** Precio por sesión, en pesos. */
  price: number
  /** Duración del turno en minutos — define el tamaño del bloque en la agenda. */
  durationMin: number
  image: string
  shortDescription: string
  description: string
  /** Qué incluye la sesión, para mostrar en el detalle. */
  includes: string[]
  /** Profesional a cargo. Opcional: la estética puede tener una sola. */
  professional?: string
  badge?: ServiceBadge
  /** Cantidad de sesiones recomendadas para ver resultados. */
  recommendedSessions?: number
}

const img = (seed: string) => `https://picsum.photos/seed/${seed}/800/1000`

export const serviceCategories: ServiceCategory[] = [
  "Masajes",
  "Facial",
  "Corporal",
  "Manos y Pies",
  "Depilación",
  "Pestañas y Cejas",
]

export const services: Service[] = [
  {
    id: "s1",
    name: "Masaje Descontracturante",
    category: "Masajes",
    price: 24000,
    durationMin: 60,
    image: img("masaje-descontracturante"),
    shortDescription: "Libera tensión en espalda, cuello y hombros.",
    description:
      "Masaje de presión media a profunda enfocado en los puntos de tensión de espalda, cuello y hombros. Ideal para quienes pasan muchas horas frente a la computadora o entrenan con frecuencia.",
    includes: [
      "Diagnóstico postural inicial",
      "60 minutos de masaje con aceites tibios",
      "Compresas calientes en zona cervical",
      "Recomendaciones de elongación para casa",
    ],
    professional: "Daniela P.",
    badge: "Más elegido",
    recommendedSessions: 4,
  },
  {
    id: "s2",
    name: "Masaje Relajante con Aromaterapia",
    category: "Masajes",
    price: 21000,
    durationMin: 60,
    image: img("masaje-relajante"),
    shortDescription: "Presión suave, aceites esenciales y música envolvente.",
    description:
      "Sesión de presión suave y movimientos largos, acompañada de aceites esenciales de lavanda y bergamota. Pensada para bajar el estrés y mejorar la calidad del sueño.",
    includes: [
      "Elección de blend de aceites esenciales",
      "60 minutos de masaje corporal completo",
      "Masaje de cuero cabelludo de cierre",
      "Infusión relajante al finalizar",
    ],
    professional: "Daniela P.",
    recommendedSessions: 3,
  },
  {
    id: "s3",
    name: "Masaje con Piedras Calientes",
    category: "Masajes",
    price: 28000,
    durationMin: 75,
    image: img("piedras-calientes"),
    shortDescription: "Calor profundo para descontracturar sin presión fuerte.",
    description:
      "Técnica que combina masaje manual con piedras volcánicas calientes ubicadas en los puntos de tensión. El calor relaja la musculatura en profundidad sin necesidad de presión intensa.",
    includes: [
      "Preparación de la piel con aceite de almendras",
      "75 minutos de masaje con piedras volcánicas",
      "Trabajo focalizado en zona lumbar y dorsal",
      "Hidratación final con manteca de karité",
    ],
    professional: "Daniela P.",
    badge: "Nuevo",
  },
  {
    id: "s4",
    name: "Limpieza Facial Profunda",
    category: "Facial",
    price: 26000,
    durationMin: 75,
    image: img("limpieza-facial"),
    shortDescription: "Higiene, extracción y calmado en una sesión.",
    description:
      "Protocolo completo de higiene facial: desmaquillado, exfoliación, vapor, extracción de comedones y máscara calmante según tipo de piel. Deja el rostro visiblemente más limpio y luminoso.",
    includes: [
      "Diagnóstico de piel con lámpara de aumento",
      "Doble limpieza y exfoliación enzimática",
      "Vapor ozono y extracción manual",
      "Máscara calmante + protector solar",
    ],
    professional: "Lucía M.",
    badge: "Más elegido",
    recommendedSessions: 1,
  },
  {
    id: "s5",
    name: "Dermaplaning Facial",
    category: "Facial",
    price: 23000,
    durationMin: 45,
    image: img("dermaplaning"),
    shortDescription: "Piel lisa y sin vello, con efecto luminosidad inmediato.",
    description:
      "Exfoliación mecánica con bisturí estéril que remueve células muertas y vello facial. La piel queda más lisa, el maquillaje se asienta mejor y los activos penetran más.",
    includes: [
      "Limpieza previa y desengrase de la piel",
      "Dermaplaning completo de rostro",
      "Sérum de ácido hialurónico",
      "Protector solar FPS 50",
    ],
    professional: "Lucía M.",
  },
  {
    id: "s6",
    name: "Peeling Químico Renovador",
    category: "Facial",
    price: 31000,
    durationMin: 60,
    image: img("peeling-quimico"),
    shortDescription: "Atenúa manchas, marcas y textura irregular.",
    description:
      "Aplicación controlada de ácidos según el tipo de piel para renovar la capa superficial. Mejora manchas, marcas de acné y textura. Requiere cuidado solar estricto los días posteriores.",
    includes: [
      "Consulta previa y test de sensibilidad",
      "Aplicación de ácidos en capas controladas",
      "Neutralizado y máscara reparadora",
      "Kit de cuidado post-peeling",
    ],
    professional: "Lucía M.",
    recommendedSessions: 3,
  },
  {
    id: "s7",
    name: "Drenaje Linfático Manual",
    category: "Corporal",
    price: 22000,
    durationMin: 60,
    image: img("drenaje-linfatico"),
    shortDescription: "Reduce hinchazón y mejora la circulación.",
    description:
      "Maniobras suaves y rítmicas que estimulan el sistema linfático para favorecer la eliminación de líquidos. Recomendado para piernas hinchadas, retención y post-operatorios ya autorizados.",
    includes: [
      "Evaluación de zonas con retención",
      "60 minutos de drenaje manual",
      "Vendaje frío en miembros inferiores",
      "Pautas de hidratación y alimentación",
    ],
    professional: "Daniela P.",
    recommendedSessions: 6,
  },
  {
    id: "s8",
    name: "Tratamiento Reductor Corporal",
    category: "Corporal",
    price: 27000,
    durationMin: 75,
    image: img("reductor-corporal"),
    shortDescription: "Aparatología y masaje para modelar contorno.",
    description:
      "Combinación de masaje modelador, electrodos y termoactivos para trabajar sobre adiposidad localizada y celulitis. Los resultados se sostienen con constancia y hábitos.",
    includes: [
      "Medición y registro de contorno inicial",
      "Masaje modelador de abdomen y flancos",
      "Sesión de electroestimulación",
      "Gel termoactivo y film",
    ],
    badge: "Promo",
    professional: "Daniela P.",
    recommendedSessions: 8,
  },
  {
    id: "s9",
    name: "Manicuría con Esmaltado Semipermanente",
    category: "Manos y Pies",
    price: 14000,
    durationMin: 60,
    image: img("manicuria-semi"),
    shortDescription: "Prolijidad y color que dura tres semanas.",
    description:
      "Manicuría completa con retirado de cutícula, limado y esmaltado semipermanente en el color que elijas. Terminación prolija y brillo que se mantiene hasta tres semanas.",
    includes: [
      "Remoción del esmaltado anterior",
      "Limado, prolijado y trabajo de cutícula",
      "Esmaltado semipermanente a elección",
      "Aceite nutritivo para cutículas",
    ],
    professional: "Sofía B.",
    badge: "Más elegido",
  },
  {
    id: "s10",
    name: "Pedicuría Spa Completa",
    category: "Manos y Pies",
    price: 16500,
    durationMin: 70,
    image: img("pedicuria-spa"),
    shortDescription: "Baño, exfoliación, masaje y esmaltado.",
    description:
      "Pedicuría integral que arranca con baño de inmersión con sales, sigue con exfoliación y trabajo de durezas, y cierra con masaje de pies y esmaltado.",
    includes: [
      "Baño de inmersión con sales minerales",
      "Exfoliación y trabajo de durezas",
      "Masaje de pies y pantorrillas",
      "Esmaltado tradicional o semipermanente",
    ],
    professional: "Sofía B.",
  },
  {
    id: "s11",
    name: "Depilación Definitiva con Láser",
    category: "Depilación",
    price: 19000,
    durationMin: 30,
    image: img("laser-depilacion"),
    shortDescription: "Sesión por zona, con enfriamiento incluido.",
    description:
      "Depilación con láser de diodo sobre la zona a tratar. Cada sesión actúa sobre los folículos en fase de crecimiento, por lo que se necesitan varias sesiones espaciadas para un resultado completo.",
    includes: [
      "Consulta previa y test de fototipo",
      "Rasurado de la zona a tratar",
      "Sesión de láser con punta refrigerada",
      "Gel calmante post-sesión",
    ],
    recommendedSessions: 8,
  },
  {
    id: "s12",
    name: "Depilación con Cera Tibia",
    category: "Depilación",
    price: 9500,
    durationMin: 30,
    image: img("cera-tibia"),
    shortDescription: "Rápida, prolija y con cera hipoalergénica.",
    description:
      "Depilación tradicional con cera tibia hipoalergénica, apta para pieles sensibles. Resultado inmediato y prolijo, con aceite calmante para reducir enrojecimiento.",
    includes: [
      "Preparación e higiene de la zona",
      "Depilación con cera tibia hipoalergénica",
      "Retirado de vello residual con pinza",
      "Aceite calmante post-depilación",
    ],
  },
  {
    id: "s13",
    name: "Lifting de Pestañas",
    category: "Pestañas y Cejas",
    price: 17500,
    durationMin: 60,
    image: img("lifting-pestanas"),
    shortDescription: "Curvatura y definición sin extensiones.",
    description:
      "Tratamiento que riza y fija las pestañas naturales desde la raíz, con nutrición de keratina. Abre la mirada sin necesidad de extensiones ni máscara diaria.",
    includes: [
      "Limpieza y desengrase de pestañas",
      "Permanente con rizado a medida",
      "Nutrición con keratina",
      "Tintura opcional sin cargo",
    ],
    professional: "Sofía B.",
    badge: "Nuevo",
  },
  {
    id: "s14",
    name: "Perfilado y Laminado de Cejas",
    category: "Pestañas y Cejas",
    price: 15000,
    durationMin: 50,
    image: img("laminado-cejas"),
    shortDescription: "Cejas peinadas, simétricas y con más densidad visual.",
    description:
      "Diseño de ceja según la morfología del rostro, seguido de laminado para fijar los vellos en su lugar. Da un efecto más poblado y prolijo que dura varias semanas.",
    includes: [
      "Diseño y medición según el rostro",
      "Laminado y fijación de vellos",
      "Perfilado con cera y pinza",
      "Nutrición con aceite reparador",
    ],
    professional: "Sofía B.",
  },
]

export const getServiceById = (id: string) => services.find((s) => s.id === id)
