import dotenv from "dotenv"

// Igual que Vite: lo local va en `.env.local`; `.env` queda de respaldo.
dotenv.config({ path: [".env.local", ".env"], quiet: true })

// Zona horaria del local, no del servidor (suele ser UTC y correría todo 3 horas).
// Va antes de cualquier uso de Date; conexion.database.ts pone la misma en MySQL.
process.env.TZ = process.env.ZONA_HORARIA ?? "America/Argentina/Buenos_Aires"

function requerida(nombre: string): string {
  const valor = process.env[nombre]
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre} (ver .env.example)`)
  return valor
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  // Orígenes que pueden llamar a la API: la web pública y el panel, separados por coma
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:5173,http://localhost:5174")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  jwtSecret: requerida("JWT_SECRET"),
  // Dirección de la web pública: a dónde vuelve la clienta después de pagar en Mercado Pago.
  siteUrl: (process.env.SITE_URL ?? "http://localhost:5173").replace(/\/$/, ""),
  // Dirección pública de ESTA API, si la tiene (en producción). Mercado Pago avisa
  // los pagos a <apiPublicUrl>/api/mercadopago/webhook. En local no existe.
  apiPublicUrl: process.env.API_PUBLIC_URL?.replace(/\/$/, "") || null,
  // Proxies delante de la API (1 en deploy, 0 en local). Sin esto el límite por IP junta a todas las clientas.
  proxies: Number(process.env.TRUST_PROXY ?? 0),
  db: {
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    // Obligatorias a proposito: sin .env.local la API tiene que fallar al
    // arrancar, no conectarse como root sin clave sin que nadie se entere.
    user: requerida("DB_USER"),
    password: requerida("DB_PASSWORD"),
    database: process.env.DB_NAME ?? "dp_belleza",
  },
}
