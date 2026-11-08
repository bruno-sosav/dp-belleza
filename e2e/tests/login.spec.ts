import type { Page } from "@playwright/test"
import { ADMIN_EMAIL, ADMIN_PASSWORD, PANEL, expect, test } from "./base"

async function entrar(page: Page, password = ADMIN_PASSWORD) {
  await page.goto(PANEL)
  await page.getByLabel("Email").fill(ADMIN_EMAIL)
  await page.getByLabel("Contraseña").fill(password)
  const login = page.waitForResponse((r) => r.url().endsWith("/api/auth/login"))
  await page.getByRole("button", { name: "Entrar" }).click()
  return login
}

test.describe("Login del panel", () => {
  test("con la clave bien entra (200) y la sesión sobrevive a una recarga", async ({ page }) => {
    expect((await entrar(page)).status()).toBe(200)
    await expect(page.getByText("Sesión de")).toBeVisible()

    await page.reload()
    await expect(page.getByText("Sesión de")).toBeVisible()
  })

  test("con la clave mal no entra (401), muestra el error y borra la contraseña", async ({ page, red }) => {
    red.permitir(401)
    expect((await entrar(page, "esta-no-es-la-clave")).status()).toBe(401)
    await expect(page.getByRole("alert")).toHaveText("Email o contraseña incorrectos")
    await expect(page.getByLabel("Contraseña")).toHaveValue("")
    await expect(page.getByText("Sesión de")).toHaveCount(0)
  })

  test("cerrar sesión vuelve al login y una recarga no la recupera", async ({ page }) => {
    await entrar(page)
    await page.getByRole("button", { name: "Cerrar sesión" }).click()
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible()

    await page.reload()
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible()
  })

  test("una ruta del panel sin sesión muestra el login, no la pantalla", async ({ page }) => {
    await page.goto(`${PANEL}/clientas`)
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible()
    await expect(page.getByText("Sesión de")).toHaveCount(0)
  })

  test("con un token vencido o trucho la API responde 401 y vuelve al login", async ({ page, red }) => {
    red.permitir(401)
    await entrar(page)
    await page.evaluate(() => sessionStorage.setItem("dp-belleza:admin-token", "token-trucho"))

    const pedido = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/admin/clientes")
    await page.getByRole("link", { name: "Clientas" }).click()
    expect((await pedido).status()).toBe(401)
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible()
  })
})
