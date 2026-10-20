/**
 * Adaptadores: cumplen los puertos que los turnos tienen hacia OTROS módulos
 * usando lo que esos módulos exportan. Los que dicen TRANSITORIO apuntan a
 * código que todavía no se mudó a modules/ (configuración, recordatorios) y
 * cambian cuando se mude.
 */
import type { RowDataPacket } from "mysql2"
import { config } from "../../../core/config.js"
import { ejecutor } from "../../../core/database/MySqlUnidadDeTrabajo.js"
import { catalogo } from "../../catalog/catalog.module.js"
import { clientes } from "../../customers/customers.module.js"
import { leerConfigNumero } from "../../../shared/configuracion.js"
import { pagos, type MedioPago } from "../../payments/payments.module.js"
import { referenciaDeSena } from "../domain/sena.js"
import type {
  CajaDeTurnos,
  ClientesDeTurnos,
  ConfiguracionDeTurnos,
  PasarelaDeSenas,
  RecordatoriosDeTurnos,
  ServiciosDeTurnos,
} from "../domain/turnos.ports.js"

/** Clientas: el módulo customers. */
export const clientesDeTurnos: ClientesDeTurnos = {
  buscarOCrear: (datos, tx) => clientes.buscarOCrear(datos, tx),
  async existe(id, tx) {
    const [rows] = await ejecutor(tx).query<RowDataPacket[]>("SELECT 1 FROM clientes WHERE id = ?", [id])
    return rows.length > 0
  },
  normalizarTelefono: (texto) => clientes.normalizarTelefono(texto),
  separarNombreCompleto: (texto) => clientes.separarNombreCompleto(texto),
}

/** Servicios: el módulo catalog. */
export const serviciosDeTurnos: ServiciosDeTurnos = {
  reservable: (id, opciones) => catalogo.servicioReservable(id, opciones),
}

/** Pagos (payments): Mercado Pago. */
export const pasarelaMercadoPago: PasarelaDeSenas = {
  conectada: () => pagos.mercadoPagoConectado(),
  crearLink: (d) => {
    const vuelta = `${config.siteUrl}/reserva/pago?t=${d.token}`
    return pagos.crearLinkDePago({
      items: [{ titulo: `Seña: ${d.servicio} (${d.fecha.split("-").reverse().join("/")} ${d.hora})`, cantidad: 1, precioUnitario: d.monto }],
      referencia: referenciaDeSena(d.turnoId),
      vuelta: { exito: vuelta, pendiente: vuelta, error: vuelta },
      ...(config.apiPublicUrl ? { notificacion: `${config.apiPublicUrl}/api/mercadopago/webhook` } : {}),
    })
  },
  consultarPago: (id) => pagos.consultarPago(id),
}

/** Pagos (payments): la caja. */
export const cajaDeTurnos: CajaDeTurnos = {
  cobrarTurno: (c, tx) => pagos.cobrarTurno({ ...c, medio: c.medio as MedioPago }, tx),
  cobrarSena: (c, tx) => pagos.cobrarSena(c, tx),
  anularCobroDelTurno: (turnoId, tx) => pagos.anularCobroDelTurno(turnoId, tx),
  cobradoPorTurnos: (ids) => pagos.cobradoPorTurnos(ids),
}

/** TRANSITORIO (admin): la configuración del negocio. */
export const configuracionDeTurnos: ConfiguracionDeTurnos = {
  porcentajeSena: () => leerConfigNumero("sena_porcentaje", 0),
  horasParaCancelar: () => leerConfigNumero("cancelacion_horas_minimas", 24),
}

/** TRANSITORIO (reminders): los recordatorios ya mandados de un turno. */
export const recordatoriosDeTurnos: RecordatoriosDeTurnos = {
  olvidarEnviados: async (turnoId, tx) => {
    await ejecutor(tx).query("DELETE FROM recordatorios WHERE turno_id = ?", [turnoId])
  },
}

