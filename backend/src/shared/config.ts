import dotenv from "dotenv"

// Una sola convención en todo el repo: los valores locales van en `.env.local`.
// El frontend usa Vite, que solo lee `.env.local`, así que el backend sigue la
// misma regla en vez de pedir `.env` y que cada uno tenga que acordarse de cuál
// va en cada carpeta. `.env` se mantiene como respaldo por compatibilidad.
dotenv.config({ path: [".env.local", ".env"], quiet: true })

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
