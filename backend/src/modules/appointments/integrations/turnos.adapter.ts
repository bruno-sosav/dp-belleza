/** Cumplen los puertos de turnos hacia otros módulos con lo que esos módulos exportan. */
import type { RowDataPacket } from "mysql2"
import { config } from "../../../core/app.config.js"
import { ejecutor } from "../../../core/database/unidadDeTrabajo.database.js"
import { catalogo } from "../../catalog/catalog.module.js"
import { clientes } from "../../customers/customers.module.js"
import { ajustes } from "../../admin/admin.module.js"
import { pagos, type MedioPago } from "../../payments/payments.module.js"
import { referenciaDeSena } from "../models/sena.model.js"
import type {
  CajaDeTurnos,
  ClientesDeTurnos,
  ConfiguracionDeTurnos,
  PasarelaDeSenas,
  ServiciosDeTurnos,
} from "../models/turnos.ports.js"

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

/** Ajustes del negocio (admin). */
export const configuracionDeTurnos: ConfiguracionDeTurnos = {
  porcentajeSena: () => ajustes.porcentajeSena(),
  horasParaCancelar: () => ajustes.horasParaCancelar(),
}


