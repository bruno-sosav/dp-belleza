import { configDefaults, defineConfig } from "vitest/config"

// `npm test` corre solo los tests puros (sin base de datos), que son rápidos.
// `npm run test:integracion` corre los de test/integracion/, que pegan contra
// la API y MySQL de verdad (ver test/integracion/ayuda.ts).
const integracion = process.env.TEST_INTEGRACION === "1"

export default defineConfig({
  test: {
    include: integracion ? ["test/integracion/**/*.test.ts"] : ["test/**/*.test.ts"],
    exclude: integracion ? configDefaults.exclude : [...configDefaults.exclude, "test/integracion/**"],
    // Comparten la base: uno por vez, así no se pisan los horarios.
    fileParallelism: !integracion,
    testTimeout: 15_000,
  },
})
