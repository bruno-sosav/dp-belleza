/**
 * Adaptadores: cumplen los puertos que los turnos tienen hacia OTROS módulos
 * usando lo que esos módulos exportan. Los que dicen TRANSITORIO apuntan a
 * código que todavía no se mudó a modules/ (pagos, configuración,
 * recordatorios) y cambian cuando se mude.
 */
import type { RowDataPacket } from "mysql2"
import { config } from "../../../core/config.js"
import { ejecutor } from "../../../core/database/MySqlUnidadDeTrabajo.js"
import type { Transaccion } from "../../../core/transaccion.js"
import { catalogo } from "../../catalog/catalog.module.js"
import { clientes } from "../../customers/customers.module.js"
import { leerConfigNumero } from "../../../shared/configuracion.js"
import { consultarPago, crearPreferencia, cuentaMercadoPago, type PagoMP } from "../../../shared/mercadopago.js"
import { registrarCobro, type MedioPago } from "../../../shared/models/cobros.js"
import { referenciaDeSena, type PagoDeSena } from "../domain/sena.js"
import type {
  CajaDeTurnos,
  ClientesDeTurnos,
  ConfiguracionDeTurnos,
  PasarelaDeSenas,
  RecordatoriosDeTurnos,
  ServiciosDeTurnos,
} from "../domain/turnos.ports.js"
import type { PoolConnection } from "mysql2/promise"

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

/** Un pago de Mercado Pago, en los términos de la seña. */
export const aPagoDeSena = (p: PagoMP): PagoDeSena => ({
  id: Number(p.id),
  aprobado: p.status === "approved",
  monto: Number(p.transaction_amount),
  referencia: p.external_reference ?? null,
})

/** TRANSITORIO (payments): Mercado Pago. */
export const pasarelaMercadoPago: PasarelaDeSenas = {
  conectada: async () => (await cuentaMercadoPago()) !== null,
  async crearLink(d) {
    const vuelta = `${config.siteUrl}/reserva/pago?t=${d.token}`
    const { link } = await crearPreferencia({
      items: [{ titulo: `Seña: ${d.servicio} (${d.fecha.split("-").reverse().join("/")} ${d.hora})`, cantidad: 1, precioUnitario: d.monto }],
      referenciaExterna: referenciaDeSena(d.turnoId),
      urlsDeVuelta: { exito: vuelta, pendiente: vuelta, error: vuelta },
      ...(config.apiPublicUrl ? { urlNotificacion: `${config.apiPublicUrl}/api/mercadopago/webhook` } : {}),
    })
    return link
  },
  consultarPago: async (id) => aPagoDeSena(await consultarPago(id)),
}

const conexion = (tx: Transaccion) => ejecutor(tx) as PoolConnection

/** TRANSITORIO (payments): la caja. */
export const cajaDeTurnos: CajaDeTurnos = {
  cobrarTurno: async (c, tx) => {
    await registrarCobro(conexion(tx), { monto: c.monto, medio: c.medio as MedioPago, concepto: "turno", turnoId: c.turnoId, clienteId: c.clienteId })
  },
  cobrarSena: async (c, tx) => {
    await registrarCobro(conexion(tx), { monto: c.monto, medio: "mercadopago", concepto: "sena", turnoId: c.turnoId, clienteId: c.clienteId, mpPagoId: c.pagoId })
  },
  anularCobroDelTurno: async (turnoId, tx) => {
    await ejecutor(tx).query("DELETE FROM cobros WHERE turno_id = ? AND concepto = 'turno'", [turnoId])
  },
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

