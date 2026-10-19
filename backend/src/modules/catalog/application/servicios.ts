/**
 * Casos de uso de servicios. Sin SQL ni Express: reglas del dominio y puertos.
 */
import { invalido, noEncontrado, noExiste } from "../../../core/errores.js"
import type { ServicioRepository, TurnosDeServicios } from "../domain/ports.js"
import { elegirCategoria, type CambiosServicio, type DatosServicio, type Servicio, type ServicioReservable } from "../domain/servicio.js"

export type ServicioConTurnos = Servicio & { turnosProximos: number }

/** La web: solo los activos. El panel: todos, con cuántos turnos pedidos tiene cada uno. */
export class ListarServicios {
  constructor(
    private repo: ServicioRepository,
    private turnos: TurnosDeServicios,
  ) {}

  publicos(): Promise<Servicio[]> {
    return this.repo.listar({ incluirPausados: false })
  }

  async paraElPanel(): Promise<ServicioConTurnos[]> {
    const servicios = await this.repo.listar({ incluirPausados: true })
    const turnos = await this.turnos.pedidosAFuturo(servicios.map((s) => s.id))
    return servicios.map((s) => ({ ...s, turnosProximos: turnos.get(s.id) ?? 0 }))
  }
}

export class VerServicio {
  constructor(
    private repo: ServicioRepository,
    private turnos: TurnosDeServicios,
  ) {}

  /** La web: si está pausado, para la clienta no existe. */
  async publico(id: number): Promise<Servicio> {
    const s = await this.repo.porId(id, { incluirPausados: false })
    if (!s) throw noExiste(`No existe el servicio ${id}.`)
    return s
  }

  async paraElPanel(id: number): Promise<ServicioConTurnos> {
    const s = await this.repo.porId(id, { incluirPausados: true })
    if (!s) throw noEncontrado("Servicio")
    return { ...s, turnosProximos: (await this.turnos.pedidosAFuturo([id])).get(id) ?? 0 }
  }

  /**
   * Lo que necesita la agenda para dar un turno. Por defecto solo si está
   * activo; `incluirPausados` es para reprogramar turnos que ya existían de un
   * servicio que después se pausó.
   */
  async reservable(id: number, { incluirPausados = false } = {}): Promise<ServicioReservable> {
    const s = await this.repo.porId(id, { incluirPausados })
    if (!s) throw noExiste(`No existe el servicio ${id}.`)
    return { id: s.id, nombre: s.nombre, precio: s.precio, duracionMin: s.duracionMin }
  }
}

function validar(d: CambiosServicio) {
  if (d.duracionMin !== undefined && (d.duracionMin < 5 || d.duracionMin > 600)) throw invalido("La duración tiene que ser de 5 minutos a 10 horas.")
  if (d.precio !== undefined && d.precio < 0) throw invalido("El precio no puede ser negativo.")
}

export class CrearServicio {
  constructor(private repo: ServicioRepository) {}

  async ejecutar(datos: DatosServicio): Promise<number> {
    validar(datos)
    return this.repo.crear({ ...datos, categoria: elegirCategoria(datos.categoria, await this.repo.categoriasEnUso()) })
  }
}

/** Editar o pausar (activo: false). No hay borrar: los turnos viejos lo siguen referenciando. */
export class ActualizarServicio {
  constructor(private repo: ServicioRepository) {}

  async ejecutar(id: number, cambios: CambiosServicio): Promise<void> {
    validar(cambios)
    const final = { ...cambios }
    if (cambios.categoria !== undefined) final.categoria = elegirCategoria(cambios.categoria, await this.repo.categoriasEnUso(id))
    if (!(await this.repo.actualizar(id, final))) throw noEncontrado("Servicio")
  }
}
