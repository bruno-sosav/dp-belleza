/** Puertos de recordatorios: dueño de tipos y registros; turnos y clientas solo se leen. */
import type { Transaccion } from "../../../core/transaccion.port.js"
import type { DatosTipo, EstadoRecordatorio, Momento, Registro, Tipo } from "./recordatorio.model.js"

export interface TipoRepository {
  /** Los activos, en el orden en que se muestran: antes (del más temprano al más cercano), después, cumpleaños. */
  listar(): Promise<Tipo[]>
  porId(id: number): Promise<Tipo | null>
  crear(d: DatosTipo): Promise<number>
  /** false si no existe (o ya se borró). */
  actualizar(id: number, d: DatosTipo): Promise<boolean>
  /** Se desactiva en vez de borrarse, así no se pierde lo ya mandado. */
  desactivar(id: number): Promise<boolean>
}

export interface RegistroRepository {
  /** Mandado u omitido. Si ya estaba, se actualiza. */
  marcar(r: Registro, estado: EstadoRecordatorio): Promise<number>
  /** Deshacer: el aviso vuelve a "para mandar". false si no existe. */
  deshacer(id: number): Promise<boolean>
  hechosDeTurnos(turnoIds: number[]): Promise<{ turnoId: number; tipoId: number }[]>
  hechosDeCumple(tipoIds: number[]): Promise<{ tipoId: number; clienteId: number; anio: number }[]>
  /** El turno se movió de día u hora: hay que volver a avisarle. */
  olvidarDelTurno(turnoId: number, tx: Transaccion): Promise<void>
  /** Unir dos fichas: lo de una pasa a la otra (sin duplicar saludos del mismo año). */
  reasignarCliente(deId: number, aId: number, tx: Transaccion): Promise<void>
}

export type Clienta = { id: number; nombre: string; apellido: string | null; telefono: string }
export type TurnoCandidato = { id: number; inicio: string; servicio: string; cliente: Clienta }
export type ClientaConCumple = Clienta & { cumpleDia: number; cumpleMes: number }
export type AvisoHecho = { id: number; estado: EstadoRecordatorio; tipo: string; momento: Momento; cliente: { nombre: string; apellido: string | null } }

/** Vistas de lectura sobre turnos y clientas (de otros módulos), para no hacer un pedido por fila. */
export interface ConsultasDeRecordatorios {
  /** Turnos pedidos (con la seña pagada, si tiene) que empiezan entre `ahora` y `horas` después. */
  turnosPedidos(ahora: string, horas: number): Promise<TurnoCandidato[]>
  /** Última visita completada por clienta que cumplió `dias` dentro de `ventana`, sin turno pedido ni este tipo hecho. */
  ultimasVisitas(p: { tipoId: number; servicioId: number | null; hoy: string; ahora: string; dias: number; ventana: number }): Promise<TurnoCandidato[]>
  clientasConCumple(): Promise<ClientaConCumple[]>
  /** Lo mandado u omitido desde `fecha`, del más nuevo al más viejo. */
  hechosDesde(fecha: string): Promise<AvisoHecho[]>
}

/** De la configuración del negocio: para {negocio} en los mensajes. */
export interface NombreDelNegocio {
  obtener(): Promise<string>
}
