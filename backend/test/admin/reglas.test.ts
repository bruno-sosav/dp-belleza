import { describe, expect, it } from "vitest"
import { codigoAreaValido, comoNumero } from "../../src/modules/admin/models/ajustes.model.js"
import { rango, serieDiaria } from "../../src/modules/admin/models/estadisticas.model.js"

describe("ajustes", () => {
  it("un número mal cargado o vacío usa el valor por defecto", () => {
    expect(comoNumero({ intervalo_turnos_min: "30" }, "intervalo_turnos_min")).toBe(30)
    expect(comoNumero({ intervalo_turnos_min: "abc" }, "intervalo_turnos_min")).toBe(15)
    expect(comoNumero({ intervalo_turnos_min: "" }, "intervalo_turnos_min")).toBe(15)
    expect(comoNumero({}, "cancelacion_horas_minimas")).toBe(24)
    expect(comoNumero({ sena_porcentaje: "0" }, "sena_porcentaje")).toBe(0)
  })

  it("código de área: 2 a 4 números, sin el 0", () => {
    expect(codigoAreaValido("0223")).toBe("223")
    expect(codigoAreaValido("11")).toBe("11")
    expect(codigoAreaValido("1")).toBeUndefined()
    expect(codigoAreaValido(undefined)).toBeUndefined()
  })
})

describe("estadísticas", () => {
  it("rango: los últimos N días terminando hoy, con mañana como tope", () => {
    expect(rango("2030-03-01", 3)).toEqual({ desde: "2030-02-27", hasta: "2030-03-02" })
  })

  it("la serie trae todos los días, también los vacíos, con el día de la semana de JavaScript", () => {
    const s = serieDiaria("2030-01-07", 3, [{ fecha: "2030-01-06", ganancia: 5000, realizados: 2, cancelados: 1, ausentes: 0 }])
    expect(s.map((d) => d.fecha)).toEqual(["2030-01-05", "2030-01-06", "2030-01-07"])
    expect(s.map((d) => d.diaSemana)).toEqual([6, 0, 1]) // sábado, domingo, lunes
    expect(s[1]).toMatchObject({ servicios: 5000, realizados: 2, cancelados: 1 })
    expect(s[2]).toMatchObject({ servicios: 0, realizados: 0 })
  })
})
