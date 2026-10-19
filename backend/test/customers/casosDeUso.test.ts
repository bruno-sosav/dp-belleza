/** Casos de uso de clientas, probados con puertos en memoria (sin base de datos). */
import { beforeEach, describe, expect, it } from "vitest"
import { ErrorDeNegocio } from "../../src/core/errores.js"
import {
  ActualizarCliente,
  BuscarOCrearCliente,
  CrearCliente,
  EliminarCliente,
  ListarClientes,
  NormalizarTelefono,
  UnirClientes,
} from "../../src/modules/customers/application/casosDeUso.js"
import { ActividadFija, ClientesEnMemoria, codigoArea223, ReasignacionAnotada, tx, unidadEnMemoria } from "./enMemoria.js"

let repo: ClientesEnMemoria
let telefonos: NormalizarTelefono

const tipoDeError = async (p: Promise<unknown>) => {
  try {
    await p
    return null
  } catch (err) {
    return err instanceof ErrorDeNegocio ? err.tipo : "otro"
  }
}

beforeEach(() => {
  repo = new ClientesEnMemoria()
  telefonos = new NormalizarTelefono(codigoArea223)
})

describe("BuscarOCrearCliente (la reserva web y la tienda)", () => {
  it("crea la clienta con el teléfono normalizado, aunque falte el código de área", async () => {
    const id = await new BuscarOCrearCliente(repo, telefonos).ejecutar({ nombre: "Ana", telefono: "15 555-1234" }, tx)
    expect((await repo.porId(id))?.telefono).toBe("5492235551234")
  })

  it("si ya existe, usa su ficha: no pisa el nombre y solo completa lo que falta", async () => {
    const id = await repo.crear({ nombre: "Sofía", apellido: "Martínez", telefono: "5492235551234" })
    const usado = await new BuscarOCrearCliente(repo, telefonos).ejecutar(
      { nombre: "Sofi", apellido: "Otro", telefono: "223 555 1234", email: "sofi@ejemplo.com" },
      tx,
    )
    expect(usado).toBe(id)
    expect(await repo.porId(id)).toMatchObject({ nombre: "Sofía", apellido: "Martínez", email: "sofi@ejemplo.com" })
  })

  it("rechaza un teléfono que no sirve y un cumpleaños que no existe", async () => {
    const caso = new BuscarOCrearCliente(repo, telefonos)
    expect(await tipoDeError(caso.ejecutar({ nombre: "Ana", telefono: "22355512345" }, tx))).toBe("invalido")
    expect(await tipoDeError(caso.ejecutar({ nombre: "Ana", telefono: "2235551234", cumple: { dia: 31, mes: 4 } }, tx))).toBe("invalido")
  })
})

describe("alta y edición desde el panel", () => {
  it("no deja dos clientas con el mismo teléfono, aunque esté escrito distinto", async () => {
    const crear = new CrearCliente(repo, telefonos)
    await crear.ejecutar({ nombre: "Ana", telefono: "223 555-1234" })
    expect(await tipoDeError(crear.ejecutar({ nombre: "Otra", telefono: "0223 15 555-1234" }))).toBe("conflicto")
  })

  it("editar normaliza el teléfono nuevo y no toca lo que no viene", async () => {
    const { id } = await new CrearCliente(repo, telefonos).ejecutar({ nombre: "Ana", telefono: "2235551234", notas: "alérgica" })
    const editada = await new ActualizarCliente(repo, telefonos).ejecutar(id, { telefono: "15 555-9999" })
    expect(editada).toMatchObject({ telefono: "5492235559999", notas: "alérgica" })
  })

  it("editar una que no existe es 'no encontrado'", async () => {
    expect(await tipoDeError(new ActualizarCliente(repo, telefonos).ejecutar(99, { nombre: "X" }))).toBe("no_encontrado")
  })
})

describe("EliminarCliente", () => {
  it("con turnos o compras no se puede (se perdería la plata de Finanzas)", async () => {
    const actividad = new ActividadFija()
    const id = await repo.crear({ nombre: "Ana", telefono: "5492235551234" })
    actividad.uso_.set(id, { turnos: 3, pedidos: 0 })
    expect(await tipoDeError(new EliminarCliente(repo, actividad).ejecutar(id))).toBe("conflicto")
    expect(await repo.porId(id)).not.toBeNull()
  })

  it("sin historial, sí", async () => {
    const id = await repo.crear({ nombre: "Ana", telefono: "5492235551234" })
    await new EliminarCliente(repo, new ActividadFija()).ejecutar(id)
    expect(await repo.porId(id)).toBeNull()
  })
})

describe("UnirClientes", () => {
  it("pasa todo a la que queda, completa sus datos, junta notas, se queda con el teléfono elegido y borra la otra", async () => {
    const queda = await repo.crear({ nombre: "Ana", apellido: "Pérez", telefono: "5492235551111", notas: "nota A" })
    const otra = await repo.crear({ nombre: "Ana", apellido: "Pérez", telefono: "5492235552222", email: "ana@ejemplo.com", cumple: { dia: 3, mes: 3 }, notas: "nota B" })
    const reasignacion = new ReasignacionAnotada()

    const movido = await new UnirClientes(repo, reasignacion, unidadEnMemoria).ejecutar(queda, otra, "otra")

    expect(movido).toEqual({ turnos: 2, compras: 1 })
    expect(reasignacion.llamadas).toEqual([[otra, queda]])
    expect(await repo.porId(otra)).toBeNull()
    expect(await repo.porId(queda)).toMatchObject({
      telefono: "5492235552222",
      email: "ana@ejemplo.com",
      cumple: { dia: 3, mes: 3 },
      notas: "nota A\n\nnota B",
    })
  })

  it("no une una ficha consigo misma ni con una que no existe", async () => {
    const id = await repo.crear({ nombre: "Ana", telefono: "5492235551111" })
    const unir = new UnirClientes(repo, new ReasignacionAnotada(), unidadEnMemoria)
    expect(await tipoDeError(unir.ejecutar(id, id, "esta"))).toBe("invalido")
    expect(await tipoDeError(unir.ejecutar(id, 99, "esta"))).toBe("no_encontrado")
  })
})

describe("ListarClientes", () => {
  it("junta cada clienta con su actividad", async () => {
    const actividad = new ActividadFija()
    const id = await repo.crear({ nombre: "Ana", telefono: "5492235551111" })
    actividad.uso_.set(id, { turnos: 5, pedidos: 2 })
    const [fila] = await new ListarClientes(repo, actividad).ejecutar()
    expect(fila).toMatchObject({ id, nombre: "Ana", visitas: 5, compras: 2 })
  })
})
