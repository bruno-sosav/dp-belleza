import { configDefaults, defineConfig } from "vitest/config"

// TEST_INTEGRACION: sin definir = solo unitarios (sin base) · "1" = solo integración
// (API + MySQL de verdad, ver test/integracion/ayuda.ts) · "todo" = los dos.
const modo = process.env.TEST_INTEGRACION === "1" ? "integracion" : process.env.TEST_INTEGRACION === "todo" ? "todo" : "unitarios"
const conBase = modo !== "unitarios"

export default defineConfig({
  test: {
    include: modo === "integracion" ? ["test/integracion/**/*.test.ts"] : ["test/**/*.test.ts"],
    exclude: conBase ? configDefaults.exclude : [...configDefaults.exclude, "test/integracion/**"],
    // Comparten la base: uno por vez, así no se pisan los horarios.
    fileParallelism: !conBase,
    testTimeout: 15_000,
    ...(conBase ? { globalSetup: ["test/integracion/preparar.ts"] } : {}),
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // index.ts solo arranca el servidor; los .ports.ts son solo interfaces.
      exclude: ["src/index.ts", "src/**/*.ports.ts", "src/core/transaccion.port.ts"],
      reporter: ["text-summary", "html", "json-summary"],
      reportsDirectory: `coverage/${modo}`,
    },
  },
})
