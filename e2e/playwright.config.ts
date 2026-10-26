import { defineConfig, devices } from "@playwright/test"

// Tests end to end: un navegador real recorre la web y el panel contra la API y MySQL.
// Si la API y las dos apps ya están corriendo (npm run dev:api / dev / dev:admin), las reusa.
const enCI = !!process.env.CI

export default defineConfig({
  testDir: "./tests",
  // Los tests cuentan una historia en orden (reservar → verla en el panel → cancelar).
  fullyParallel: false,
  workers: 1,
  retries: enCI ? 1 : 0,
  timeout: 60_000,
  reporter: [["list"], ["html", { outputFolder: "../reportes/e2e", open: "never" }]],
  outputDir: "../reportes/e2e-resultados",
  use: {
    ...devices["Desktop Chrome"],
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
    // Captura de cada test en el reporte; traza y video solo si falla.
    screenshot: "on",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    { command: "npm run dev:api", cwd: "..", url: "http://localhost:3000/api/salud", reuseExistingServer: !enCI, timeout: 120_000 },
    { command: "npm run dev", cwd: "..", url: "http://localhost:5173", reuseExistingServer: !enCI, timeout: 120_000 },
    { command: "npm run dev:admin", cwd: "..", url: "http://localhost:5174", reuseExistingServer: !enCI, timeout: 120_000 },
  ],
})
