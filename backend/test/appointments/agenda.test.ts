/** Agenda: disponibilidad, horario y días cerrados, con un reloj FIJO y repositorios en memoria. */
import { describe, expect, it } from "vitest"
import { ErrorDeNegocio } from "../../src/core/negocio.error.js"
import type { Reloj } from "../../src/core/reloj.port.js"
import { CalcularDisponibilidad, CambiarHorario, GestionarBloqueos } from "../../src/modules/appointments/services/agenda.usecases.js"
import type { BloqueoRepository, OcupacionDeAgenda, TurnoPedido } from "../../src/modules/appointments/models/agenda.ports.js"
import { problemaDeBloqueo, type Bloqueo } from "../../src/modules/appointments/models/bloqueo.model.js"
import { horariosDelDia, recortarAlDia, type Ocupado } from "../../src/modules/appointments/models/disponibilidad.model.js"
import { problemaDeHorario, type Franja } from "../../src/modules/appointments/models/horario.model.js"

// lunes 19/10/2026 a las 10:00
const reloj: Reloj = { ahora: () => ({ fecha: "2026-10-19", minutos: 10 * 60 }) }
const lunes = [{ diaSemana: 1, desde: "09:00", hasta: "13:00" }]

const horas = (slots: { hora: string; libre: boolean }[]) => slots.filter((s) => s.libre).map((s) => s.hora)

describe("horariosDelDia (función pura)", () => {
  const base = { fecha: "2026-10-26", franjas: lunes, duracionMin: 60, paso: 60, ocupados: [] as Ocupado[], ahora: reloj.ahora(), reglas: null }

  it("ofrece cada hora que ENTRA entera antes del cierre", () => {
    expect(horas(horariosDelDia(base))).toEqual(["09:00", "10:00", "11:00", "12:00"])
  })

  it("lo ocupado no se ofrece, aunque se pise solo en parte", () => {
    expect(horas(horariosDelDia({ ...base, ocupados: [{ desde: 10 * 60 + 30, hasta: 11 * 60 }] }))).toEqual(["09:00", "11:00", "12:00"])
  })

  it("hoy, lo que ya pasó no se ofrece", () => {
    expect(horas(horariosDelDia({ ...base, fecha: "2026-10-19" }))).toEqual(["11:00", "12:00"])
  })

  it("la web aplica la anticipación mínima; el panel no", () => {
    const hoy = { ...base, fecha: "2026-10-19" }
    expect(horas(horariosDelDia({ ...hoy, reglas: { minHoras: 2, maxDias: 60 } }))).toEqual(["12:00"])
    expect(horas(horariosDelDia({ ...hoy, reglas: null }))).toEqual(["11:00", "12:00"])
  })

  it("más allá del máximo de días, la web no ofrece nada", () => {
    expect(horariosDelDia({ ...base, fecha: "2027-01-04", reglas: { minHoras: 0, maxDias: 60 } })).toEqual([])
  })
})

describe("reglas de la agenda", () => {
  it("un turno que no entra en el horario, o un día cerrado", () => {
    expect(problemaDeHorario(lunes, 12 * 60 + 30, 13 * 60 + 30, 60)).toMatch(/no entra/)
    expect(problemaDeHorario([], 600, 660, 60)).toMatch(/no atiende/)
    expect(problemaDeHorario(lunes, 600, 660, 60)).toBeNull()
  })

  it("un día cerrado: el final después del comienzo, y no en el pasado", () => {
    expect(problemaDeBloqueo("2026-10-20 10:00", "2026-10-20 09:00", "2026-10-19 10:00")).toMatch(/después/)
    expect(problemaDeBloqueo("2026-10-18 10:00", "2026-10-18 11:00", "2026-10-19 10:00")).toMatch(/ya pasó/)
    expect(problemaDeBloqueo("2026-10-24 00:00", "2026-10-25 00:00", "2026-10-19 10:00")).toBeNull()
  })

  it("un bloqueo de varios días se recorta a cada día", () => {
    expect(recortarAlDia("2026-12-24 00:00:00", "2026-12-26 00:00:00", "2026-12-25")).toEqual({ desde: 0, hasta: 24 * 60 })
    expect(recortarAlDia("2026-12-24 14:00:00", "2026-12-24 16:00:00", "2026-12-24")).toEqual({ desde: 840, hasta: 960 })
  })
})

// --- puertos en memoria
const turnoPedido: TurnoPedido = { id: 7, fecha: "2026-10-26", horaInicio: "15:00", horaFin: "16:00", servicio: "Masaje", cliente: { nombre: "Ana", apellido: null, telefono: "549223" } }
const ocupacion = (ocupado: Ocupado[] = []): OcupacionDeAgenda => ({ turnosDelDia: async () => ocupado, pedidosFuturos: async () => [turnoPedido] })
const sinBloqueos: BloqueoRepository = {
  vigentes: async () => [],
  entre: async () => [],
  ocupadoDelDia: async () => [],
  crear: async (d) => ({ id: 1, ...d }) as Bloqueo,
  eliminar: async () => false,
}
const horarioEnMemoria = (franjas: Franja[]) => ({
  franjas,
  listar: async function () {
    return this.franjas
  },
  reemplazar: async function (nuevas: Franja[]) {
    this.franjas = nuevas
  },
})

describe("casos de uso de la agenda", () => {
  it("CalcularDisponibilidad: un día cerrado no tiene horarios", async () => {
    const caso = new CalcularDisponibilidad(horarioEnMemoria(lunes), sinBloqueos, ocupacion(), { intervaloMin: async () => 60, reglas: async () => ({ minHoras: 0, maxDias: 60 }) }, { duracion: async () => 60 }, reloj)
    expect(await caso.ejecutar(1, "2026-10-25")).toEqual([]) // domingo
    expect((await caso.ejecutar(1, "2026-10-26")).filter((s) => s.libre)).toHaveLength(4)
  })

  it("CambiarHorario: devuelve los turnos que quedan afuera y no cancela nada", async () => {
    const r = await new CambiarHorario(horarioEnMemoria(lunes), ocupacion(), reloj).ejecutar(lunes)
    expect(r.turnosFuera.map((t) => t.id)).toEqual([7]) // el lunes cierra a las 13 y el turno es a las 15
  })

  it("CambiarHorario: rechaza franjas que se pisan", async () => {
    const caso = new CambiarHorario(horarioEnMemoria(lunes), ocupacion(), reloj)
    await expect(caso.ejecutar([...lunes, { diaSemana: 1, desde: "12:00", hasta: "14:00" }])).rejects.toBeInstanceOf(ErrorDeNegocio)
  })

  it("GestionarBloqueos: quitar uno que no existe es 'no encontrado'", async () => {
    await expect(new GestionarBloqueos(sinBloqueos, ocupacion(), reloj).quitar(9)).rejects.toMatchObject({ tipo: "no_encontrado" })
  })
})
