import { expect, test } from "@playwright/test"
import { ADMIN_EMAIL, ADMIN_PASSWORD, CLIENTA, PANEL, WEB, limpiar } from "./base"

// La vida de un turno de punta a punta: la clienta reserva en la web, la dueña la ve
// en el panel y la clienta lo cancela desde "Mi turno".
test.describe.serial("Turno de punta a punta", () => {
  let codigo = ""

  test.beforeAll(limpiar)
  test.afterAll(limpiar)

  test("una clienta reserva un turno desde la web", async ({ page }) => {
    await page.goto(`${WEB}/servicios`)
    await page.getByRole("link", { name: "Reservar", exact: true }).first().click()
    await expect(page.getByRole("heading", { name: "Reservar turno" })).toBeVisible()

    // Primer día con horarios libres desde dentro de 3 días: así el turno se puede
    // cancelar desde la web después (la regla por defecto es hasta 24 hs antes).
    const desde = new Date()
    desde.setDate(desde.getDate() + 3)
    const mesesHasta = (desde.getMonth() - new Date().getMonth() + 12) % 12
    for (let i = 0; i < mesesHasta; i++) await page.getByRole("button", { name: "Mes siguiente" }).click()

    const calendario = page.locator("section", { has: page.getByRole("heading", { name: "1. Elegí el día" }) })
    const horarios = page.locator("section", { has: page.getByRole("heading", { name: "2. Elegí el horario" }) })
    const horarioLibre = horarios.getByRole("button", { name: /^\d{2}:\d{2}$/ }).and(page.locator(":enabled"))
    let elegido = false
    for (let mes = 0; mes < 3 && !elegido; mes++) {
      const dias = calendario.getByRole("button", { name: /^\d{1,2}$/ }).and(page.locator(":enabled"))
      for (let i = 0; i < (await dias.count()) && !elegido; i++) {
        if (mes === 0 && Number(await dias.nth(i).textContent()) < desde.getDate()) continue
        await dias.nth(i).click()
        await expect(horarios.getByText(/Buscando horarios/)).toHaveCount(0)
        if (await horarioLibre.count()) {
          await horarioLibre.first().click()
          elegido = true
        }
      }
      if (!elegido) await page.getByRole("button", { name: "Mes siguiente" }).click()
    }
    expect(elegido, "ningún día de los próximos 3 meses tiene horarios libres").toBe(true)

    await page.getByRole("button", { name: "Continuar con mis datos" }).click()
    await page.getByLabel("Nombre y apellido").fill(CLIENTA.nombre)
    await page.getByLabel("Teléfono").fill(CLIENTA.telefono)
    await page.getByRole("button", { name: "Confirmar turno" }).click()

    await expect(page.getByRole("heading", { name: "¡Turno reservado!" })).toBeVisible()
    codigo = (await page.getByText(/Código de turno: DP-\d+/).textContent())!.replace("Código de turno:", "").trim()
    expect(codigo).toMatch(/^DP-\d+$/)
  })

  test("la dueña ve a la clienta y su turno en el panel", async ({ page }) => {
    await page.goto(PANEL)
    await page.getByLabel("Email").fill(ADMIN_EMAIL)
    await page.getByLabel("Contraseña").fill(ADMIN_PASSWORD)
    await page.getByRole("button", { name: "Entrar" }).click()
    await expect(page.getByText("Sesión de")).toBeVisible()

    await page.getByRole("link", { name: "Clientas" }).click()
    await page.getByPlaceholder(/Buscar por nombre o teléfono/).fill("E2E")
    await page.getByRole("link", { name: new RegExp(CLIENTA.nombre) }).first().click()

    await expect(page.getByRole("heading", { name: CLIENTA.nombre })).toBeVisible()
    await expect(page.getByText("Próximo turno")).toBeVisible()
  })

  test("la clienta cancela su turno desde Mi turno", async ({ page }) => {
    await page.goto(`${WEB}/mi-turno`)
    await page.getByLabel("Código del turno").fill(codigo)
    await page.getByLabel("Teléfono").fill(CLIENTA.telefono)
    await page.getByRole("button", { name: "Buscar mi turno" }).click()

    await page.getByRole("button", { name: "Cancelar mi turno" }).click()
    await page.getByRole("button", { name: "Sí, cancelar" }).click()
    await expect(page.getByText("Listo, tu turno quedó cancelado.")).toBeVisible()
  })
})

test("el panel no deja entrar con una contraseña incorrecta", async ({ page }) => {
  await page.goto(PANEL)
  await page.getByLabel("Email").fill(ADMIN_EMAIL)
  await page.getByLabel("Contraseña").fill("esta-no-es-la-clave")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page.getByText("Email o contraseña incorrectos")).toBeVisible()
  await expect(page.getByText("Sesión de")).toHaveCount(0)
})
