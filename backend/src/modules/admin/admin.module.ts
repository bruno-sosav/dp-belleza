/**
 * Módulo de administración del negocio (admin). Raíz de composición: crea las
 * implementaciones concretas, las inyecta en los casos de uso y exporta solo
 * lo que el resto del sistema puede usar.
 *
 * Dos partes:
 *   - AJUSTES (`ajustes`): los parámetros del negocio. Los leen turnos,
 *     clientas y recordatorios, así que este módulo no importa a ninguno de
 *     ellos: las clientas se conectan acá (`conectarTelefonos`).
 *   - ESTADÍSTICAS (`estadisticas`): la serie diaria y los servicios más hechos.
 */
import { relojDelSistema } from "../../core/reloj.port.js"
import { GuardarAjustes, LeerAjustes, VerAjustesPublicos, type ConexionConTelefonos } from "./services/ajustes.usecases.js"
import { VerEstadisticas } from "./services/estadisticas.usecases.js"
import type { NormalizadorDeTelefono } from "./models/ajustes.model.js"
import { MySqlAjustesRepository } from "./repositories/ajustes.repository.js"
import { MySqlConsultasDeEstadisticas } from "./repositories/estadisticas.queries.js"
import { mercadoPagoDelLocal } from "./integrations/mercadoPago.adapter.js"
import { AjustesController } from "./controllers/ajustes.controller.js"
import { EstadisticasController } from "./controllers/estadisticas.controller.js"
import { rutasAjustesPanel, rutasAjustesWeb } from "./controllers/ajustes.routes.js"
import { rutasEstadisticasPanel } from "./controllers/estadisticas.routes.js"

const repo = new MySqlAjustesRepository()
const telefonos: ConexionConTelefonos = { normalizar: null }
const leer = new LeerAjustes(repo)
const ajustesController = new AjustesController({
  leer,
  guardar: new GuardarAjustes(repo, leer, telefonos),
  publicos: new VerAjustesPublicos(leer, mercadoPagoDelLocal),
})

/** Lo que los ajustes ofrecen al resto del sistema. */
export const ajustes = {
  /** Lo que ve la web: se monta bajo /api/configuracion. */
  rutasWeb: rutasAjustesWeb(ajustesController),
  /** Ajustes del panel: se monta bajo /api/admin, después de requiereLogin. */
  rutasPanel: rutasAjustesPanel(ajustesController),

  /** El módulo de clientas se conecta al arrancar: con esto se normaliza el WhatsApp del local. */
  conectarTelefonos: (normalizar: NormalizadorDeTelefono) => {
    telefonos.normalizar = normalizar
  },

  nombreNegocio: () => leer.texto("nombre_negocio"),
  /** 2 a 4 números, o undefined si no está bien cargado. */
  codigoArea: () => leer.codigoDeArea(),
  intervaloTurnos: () => leer.numero("intervalo_turnos_min"),
  reglasDeReserva: async () => ({ minHoras: await leer.numero("reserva_anticipacion_min_horas"), maxDias: await leer.numero("reserva_anticipacion_max_dias") }),
  /** El % configurado (si se cobra o no depende además de Mercado Pago: eso lo decide turnos). */
  porcentajeSena: () => leer.numero("sena_porcentaje"),
  horasParaCancelar: () => leer.numero("cancelacion_horas_minimas"),
}

/** Lo que las estadísticas ofrecen al resto del sistema. */
export const estadisticas = {
  /** /stats/…: se monta bajo /api/admin, después de requiereLogin. */
  rutasPanel: rutasEstadisticasPanel(new EstadisticasController(new VerEstadisticas(new MySqlConsultasDeEstadisticas(), relojDelSistema))),
}
