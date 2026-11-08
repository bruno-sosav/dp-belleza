import type { Page } from "@playwright/test"
import { ADMIN_EMAIL, ADMIN_PASSWORD, PANEL, WEB, expect, test } from "./base"

// Corre solo en el proyecto "celular" (pantalla de teléfono, ver playwright.config.ts).

/** Nada se sale de la pantalla: no hay scroll horizontal. */
async function entraEnPantalla(page: Page) {
  await page.waitForLoadState("networkidle")
  const { ancho, pantalla } = await page.evaluate(() => ({ ancho: document.documentElement.scrollWidth, pantalla: window.innerWidth }))
  expect(ancho, "la página es más ancha que la pantalla (scroll horizontal)").toBeLessThanOrEqual(pantalla)
}

async function captura(page: Page, nombre: string) {
  await test.info().attach(nombre, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" })
}

test.describe("Web pública en el celular", () => {
  test("las páginas entran en la pantalla", async ({ page, request }) => {
    const servicios = (await (await request.get("http://localhost:3000/api/turnos/servicios")).json()) as { id: number }[]
    const rutas = ["/", "/servicios", `/servicios/${servicios[0].id}`, `/reservar/${servicios[0].id}`, "/mi-turno", "/tienda", "/carrito", "/contacto"]
    for (const ruta of rutas) {
      await test.step(ruta, async () => {
        await page.goto(`${WEB}${ruta}`)
        await entraEnPantalla(page)
        await captura(page, `web ${ruta}`)
      })
    }
  })

  test("el menú hamburguesa abre y lleva a Mi turno", async ({ page }) => {
    await page.goto(WEB)
    await page.getByRole("button", { name: "Abrir menú" }).click()
    await page.getByRole("navigation").getByRole("link", { name: "Mi turno" }).last().click()
    await expect(page).toHaveURL(/\/mi-turno$/)
  })
})

test.describe("Panel en el celular", () => {
  test("las secciones entran en la pantalla", async ({ page }) => {
    await page.goto(PANEL)
    await page.getByLabel("Email").fill(ADMIN_EMAIL)
    await page.getByLabel("Contraseña").fill(ADMIN_PASSWORD)
    await page.getByRole("button", { name: "Entrar" }).click()
    await expect(page.getByRole("button", { name: "Salir" })).toBeVisible()

    const rutas = ["/", "/turnos", "/clientes", "/servicios", "/finanzas", "/finanzas/analisis", "/recordatorios", "/pedidos", "/productos", "/ajustes"]
    for (const ruta of rutas) {
      await test.step(ruta, async () => {
        await page.goto(`${PANEL}${ruta}`)
        await entraEnPantalla(page)
        await captura(page, `panel ${ruta}`)
      })
    }
  })
})
