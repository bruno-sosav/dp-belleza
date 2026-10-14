export type Product = {
  id: string
  name: string
  category: string
  price: number
  oldPrice?: number
  image: string
  rating: number
  reviews: number
  badge?: "Nuevo" | "Oferta" | "Bestseller"
  description: string
  sizes?: string[]
  /** false = dado de baja: no se muestra en la web, pero no se borra (campo `activo` de la tabla productos). */
  active: boolean
}

export const productBadges = ["Nuevo", "Oferta", "Bestseller"] as const

const img = (seed: string) => `https://picsum.photos/seed/${seed}/600/750`

export const categories = [
  "Skincare",
  "Maquillaje",
  "Cabello",
  "Perfumes",
  "Cuidado Corporal",
]

/** Catálogo inicial. Los cambios del panel de administración se guardan en productStore. */
const seedProducts: Omit<Product, "active">[] = [
  {
    id: "p1",
    name: "Sérum Facial Vitamina C",
    category: "Skincare",
    price: 18900,
    oldPrice: 22900,
    image: img("serum-vitc"),
    rating: 4.8,
    reviews: 214,
    badge: "Bestseller",
    description:
      "Sérum iluminador con vitamina C estabilizada al 15% que unifica el tono de la piel, reduce manchas y aporta luminosidad desde la primera aplicación.",
    sizes: ["30ml", "50ml"],
  },
  {
    id: "p2",
    name: "Crema Hidratante Ácido Hialurónico",
    category: "Skincare",
    price: 15500,
    image: img("crema-hialuronico"),
    rating: 4.6,
    reviews: 132,
    description:
      "Hidratación profunda de 24hs gracias a su fórmula con tres pesos moleculares de ácido hialurónico. Textura liviana, apta para todo tipo de piel.",
    sizes: ["50ml", "100ml"],
  },
  {
    id: "p3",
    name: "Paleta de Sombras Nude Edition",
    category: "Maquillaje",
    price: 21900,
    image: img("paleta-nude"),
    rating: 4.9,
    reviews: 340,
    badge: "Nuevo",
    description:
      "12 tonos mate y shimmer en una paleta versátil pensada para looks de día y de noche. Alta pigmentación y larga duración.",
  },
  {
    id: "p4",
    name: "Labial Líquido Mate",
    category: "Maquillaje",
    price: 8900,
    oldPrice: 11500,
    image: img("labial-mate"),
    rating: 4.5,
    reviews: 98,
    badge: "Oferta",
    description:
      "Color intenso de acabado mate aterciopelado con fórmula libre de resecado. Disponible en 10 tonalidades.",
  },
  {
    id: "p5",
    name: "Shampoo Reparador Keratina",
    category: "Cabello",
    price: 12300,
    image: img("shampoo-keratina"),
    rating: 4.4,
    reviews: 176,
    description:
      "Limpieza suave con keratina hidrolizada que repara la fibra capilar y devuelve brillo y suavidad al cabello dañado.",
    sizes: ["300ml", "500ml"],
  },
  {
    id: "p6",
    name: "Aceite Capilar Nutritivo",
    category: "Cabello",
    price: 9800,
    image: img("aceite-capilar"),
    rating: 4.7,
    reviews: 89,
    badge: "Nuevo",
    description:
      "Mezcla de aceites de argán y macadamia que nutre puntas abiertas y controla el frizz sin apelmazar.",
  },
  {
    id: "p7",
    name: "Perfume Floral Intenso 50ml",
    category: "Perfumes",
    price: 32900,
    image: img("perfume-floral"),
    rating: 4.9,
    reviews: 256,
    badge: "Bestseller",
    description:
      "Fragancia floral con notas de jazmín, peonía y un fondo amaderado cálido. Larga duración, ideal para el día a día.",
    sizes: ["30ml", "50ml", "90ml"],
  },
  {
    id: "p8",
    name: "Eau de Parfum Ámbar",
    category: "Perfumes",
    price: 28500,
    image: img("perfume-ambar"),
    rating: 4.6,
    reviews: 141,
    description:
      "Composición oriental con ámbar, vainilla y especias suaves. Un aroma envolvente pensado para la noche.",
  },
  {
    id: "p9",
    name: "Manteca Corporal Karité",
    category: "Cuidado Corporal",
    price: 11200,
    image: img("manteca-karite"),
    rating: 4.5,
    reviews: 77,
    description:
      "Manteca corporal 100% natural que nutre profundamente la piel seca y deja un aroma suave y duradero.",
  },
  {
    id: "p10",
    name: "Exfoliante Corporal de Café",
    category: "Cuidado Corporal",
    price: 9400,
    oldPrice: 12000,
    image: img("exfoliante-cafe"),
    rating: 4.3,
    reviews: 64,
    badge: "Oferta",
    description:
      "Exfoliante con granos de café y aceites esenciales que renueva la piel y estimula la circulación.",
  },
  {
    id: "p11",
    name: "Base Líquida Cobertura Media",
    category: "Maquillaje",
    price: 17300,
    image: img("base-liquida"),
    rating: 4.6,
    reviews: 190,
    description:
      "Base de cobertura media a alta, acabado natural. Disponible en 20 tonos con protección solar SPF 15.",
  },
  {
    id: "p12",
    name: "Protector Solar Facial FPS 50",
    category: "Skincare",
    price: 14700,
    image: img("protector-solar"),
    rating: 4.8,
    reviews: 302,
    badge: "Bestseller",
    description:
      "Protección de amplio espectro con textura ligera y acabado invisible, apto para uso diario bajo maquillaje.",
  },
]

export const initialProducts: Product[] = seedProducts.map((p) => ({ ...p, active: true }))
