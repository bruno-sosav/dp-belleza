/** Variables de entorno. Si falta algo, el servidor no arranca: mejor ahora que en la primera request. */

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Copiá backend/.env.example como .env.local y completala.`,
    )
  }
  return value
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  db: {
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: required("DB_USER"),
    password: required("DB_PASSWORD"),
    database: required("DB_NAME"),
  },
  corsOrigins: (process.env.CORS_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean),
}
