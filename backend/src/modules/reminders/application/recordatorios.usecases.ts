/** Casos de uso de recordatorios. */
import { invalido, noEncontrado } from "../../../core/negocio.error.js"
import type { Reloj } from "../../../core/reloj.port.js"
import { aDateTime, fechaLarga, sumarDias } from "../../../core/tiempo.util.js"
import {
  armarMensaje,
  avisoQueToca,
  cumpleQueToca,
  horasEntre,
  problemaDeRegistro,
  proximoCumple,
  VENTANA_DESPUES_DIAS,
  type DatosTipo,
  type EstadoRecordatorio,
  type Momento,
  type Registro,
  type Tipo,
} from "../domain/recordatorio.model.js"
import type { Clienta, ConsultasDeRecordatorios, NombreDelNegocio, RegistroRepository, TipoRepository, TurnoCandidato } from "../domain/recordatorios.ports.js"

/**
 * Un aviso para mandar. `registro` es lo que el panel manda de vuelta al
 * marcarlo: identifica el aviso sin que el panel sepa cómo se guarda.
 */
export type Aviso = {
  momento: Momento
  tipo: { id: number; nombre: string }
  cliente: Clienta
  /** Antes: el turno que viene. Después: la visita que pasó. Cumpleaños: null. */
  turno: { id: number; fecha: string; hora: string; servicio: string } | null
  /** Solo cumpleaños: día, mes y cuántos días faltan (0 = hoy). */
  cumple: { dia: number; mes: number; faltan: number } | null
  mensaje: string
  registro: Registro
}

const turnoDe = (t: TurnoCandidato) => ({ id: t.id, fecha: t.inicio.slice(0, 10), hora: t.inicio.slice(11, 16), servicio: t.servicio })

/**
 * Lo que hoy hay que mandar, con el mensaje ya armado: primero los de antes
 * del turno, después los de después de la visita y al final los cumpleaños.
 * Y lo hecho hoy, para poder deshacer.
 */
export class VerRecordatorios {
  constructor(
    private tipos: TipoRepository,
    private registros: RegistroRepository,
    private consultas: ConsultasDeRecordatorios,
    private negocio: NombreDelNegocio,
    private reloj: Reloj,
  ) {}

  async ejecutar(): Promise<{ paraMandar: Aviso[]; hechosHoy: Awaited<ReturnType<ConsultasDeRecordatorios["hechosDesde"]>> }> {
    const tipos = await this.tipos.listar()
    const negocio = await this.negocio.obtener()
    const { fecha: hoy, minutos } = this.reloj.ahora()
    const ahora = aDateTime(hoy, minutos)
    const paraMandar = [
      ...(await this.antes(tipos, negocio, ahora)),
      ...(await this.despues(tipos, negocio, hoy, ahora)),
      ...(await this.cumpleanos(tipos, negocio, hoy)),
    ]
    return { paraMandar, hechosHoy: await this.consultas.hechosDesde(hoy) }
  }

  private mensaje(tipo: Tipo, t: TurnoCandidato, negocio: string) {
    const turno = turnoDe(t)
    return armarMensaje(tipo.mensaje, { nombre: t.cliente.nombre, servicio: turno.servicio, fecha: fechaLarga(turno.fecha), hora: turno.hora, negocio })
  }

  /** Antes del turno: turnos pedidos dentro de la ventana del tipo más largo. */
  private async antes(tipos: Tipo[], negocio: string, ahora: string): Promise<Aviso[]> {
    const deAntes = tipos.filter((t) => t.momento === "antes" && t.horasAntes).map((t) => ({ ...t, horasAntes: t.horasAntes! }))
    if (!deAntes.length) return []
    const turnos = await this.consultas.turnosPedidos(ahora, Math.max(...deAntes.map((t) => t.horasAntes)))
    const hechos = await this.registros.hechosDeTurnos(turnos.map((t) => t.id))
    return turnos.flatMap((t) => {
      const tipo = avisoQueToca(horasEntre(ahora, t.inicio), deAntes, hechos.filter((h) => h.turnoId === t.id).map((h) => h.tipoId))
      if (!tipo) return []
      return [{ momento: "antes" as const, tipo: { id: tipo.id, nombre: tipo.nombre }, cliente: t.cliente, turno: turnoDe(t), cumple: null, mensaje: this.mensaje(tipo, t, negocio), registro: { tipoId: tipo.id, turnoId: t.id } }]
    })
  }

  /** Después de la visita: no aparece si la clienta ya tiene otro turno pedido (ya volvió). */
  private async despues(tipos: Tipo[], negocio: string, hoy: string, ahora: string): Promise<Aviso[]> {
    const avisos: Aviso[] = []
    for (const tipo of tipos.filter((t) => t.momento === "despues" && t.dias)) {
      const visitas = await this.consultas.ultimasVisitas({ tipoId: tipo.id, servicioId: tipo.servicio?.id ?? null, hoy, ahora, dias: tipo.dias!, ventana: VENTANA_DESPUES_DIAS })
      for (const t of visitas) {
        avisos.push({ momento: "despues", tipo: { id: tipo.id, nombre: tipo.nombre }, cliente: t.cliente, turno: turnoDe(t), cumple: null, mensaje: this.mensaje(tipo, t, negocio), registro: { tipoId: tipo.id, turnoId: t.id } })
      }
    }
    return avisos
  }

  /** Cumpleaños: clientas a las que les faltan `dias` o menos. */
  private async cumpleanos(tipos: Tipo[], negocio: string, hoy: string): Promise<Aviso[]> {
    const deCumple = tipos.filter((t) => t.momento === "cumpleanos" && t.dias !== null).map((t) => ({ ...t, dias: t.dias! }))
    if (!deCumple.length) return []
    const [clientas, hechos] = await Promise.all([this.consultas.clientasConCumple(), this.registros.hechosDeCumple(deCumple.map((t) => t.id))])

    const avisos: Aviso[] = []
    for (const c of clientas) {
      const { dias: faltan, anio } = proximoCumple(hoy, c.cumpleDia, c.cumpleMes)
      const hechosDeElla = hechos.filter((h) => h.clienteId === c.id && h.anio === anio).map((h) => h.tipoId)
      const tipo = cumpleQueToca(faltan, deCumple, hechosDeElla)
      if (!tipo) continue
      const { cumpleDia, cumpleMes, ...cliente } = c
      avisos.push({
        momento: "cumpleanos",
        tipo: { id: tipo.id, nombre: tipo.nombre },
        cliente,
        turno: null,
        cumple: { dia: cumpleDia, mes: cumpleMes, faltan },
        mensaje: armarMensaje(tipo.mensaje, { nombre: c.nombre, servicio: "", fecha: fechaLarga(sumarDias(hoy, faltan)), hora: "", negocio }),
        registro: { tipoId: tipo.id, clienteId: c.id, anio },
      })
    }
    return avisos.sort((a, b) => a.cumple!.faltan - b.cumple!.faltan)
  }
}

/** Marcar un aviso como mandado u omitido, o deshacerlo. */
export class MarcarRecordatorio {
  constructor(private registros: RegistroRepository) {}

  async marcar(r: Registro, estado: EstadoRecordatorio): Promise<number> {
    const problema = problemaDeRegistro(r)
    if (problema) throw invalido(problema)
    // Por turno, la clienta sale del turno: no se guarda junto.
    return this.registros.marcar(r.turnoId !== undefined ? { tipoId: r.tipoId, turnoId: r.turnoId } : { tipoId: r.tipoId, clienteId: r.clienteId, anio: r.anio }, estado)
  }

  async deshacer(id: number): Promise<void> {
    if (!(await this.registros.deshacer(id))) throw noEncontrado("Recordatorio")
  }
}

export class GestionarTipos {
  constructor(private tipos: TipoRepository) {}

  listar() {
    return this.tipos.listar()
  }

  private async uno(id: number): Promise<Tipo> {
    const t = await this.tipos.porId(id)
    if (!t) throw noEncontrado("Tipo de recordatorio")
    return t
  }

  async crear(d: DatosTipo) {
    return this.uno(await this.tipos.crear(d))
  }

  /** Reemplaza el tipo entero (el formulario manda todo). */
  async actualizar(id: number, d: DatosTipo) {
    if (!(await this.tipos.actualizar(id, d))) throw noEncontrado("Tipo de recordatorio")
    return this.uno(id)
  }

  async borrar(id: number) {
    if (!(await this.tipos.desactivar(id))) throw noEncontrado("Tipo de recordatorio")
  }
}
