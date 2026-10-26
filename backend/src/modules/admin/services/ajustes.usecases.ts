/** Casos de uso de los ajustes del negocio. */
import { invalido } from "../../../core/negocio.error.js"
import { codigoAreaValido, comoNumero, type Ajustes, type AjusteNumerico, type ClaveAjuste, type NormalizadorDeTelefono } from "../models/ajustes.model.js"
import type { AjustesRepository, MercadoPagoDelLocal } from "../models/admin.ports.js"

/** Las clientas se conectan después (desde su módulo): hasta entonces, no hay. */
export type ConexionConTelefonos = { normalizar: NormalizadorDeTelefono | null }

/** El código de área se cachea un minuto (se usa en cada reserva) y se olvida al guardar. */
export class LeerAjustes {
  private codigoArea: { valor: string | undefined; hasta: number } | null = null

  constructor(private repo: AjustesRepository) {}

  todos(): Promise<Ajustes> {
    return this.repo.leer()
  }

  async numero(clave: AjusteNumerico): Promise<number> {
    return comoNumero(await this.repo.leer(), clave)
  }

  async texto(clave: ClaveAjuste): Promise<string> {
    return (await this.repo.leer())[clave] ?? ""
  }

  async codigoDeArea(): Promise<string | undefined> {
    if (this.codigoArea && this.codigoArea.hasta > Date.now()) return this.codigoArea.valor
    const valor = codigoAreaValido((await this.repo.leer()).codigo_area_negocio)
    this.codigoArea = { valor, hasta: Date.now() + 60_000 }
    return valor
  }

  olvidarCodigoArea() {
    this.codigoArea = null
  }
}

/** El WhatsApp del local se normaliza como el de las clientas, con el código de área nuevo si cambió. */
export class GuardarAjustes {
  constructor(
    private repo: AjustesRepository,
    private leer: LeerAjustes,
    private telefonos: ConexionConTelefonos,
  ) {}

  async ejecutar(cambios: Partial<Record<ClaveAjuste, string | number>>): Promise<Ajustes> {
    const textos = Object.fromEntries(Object.entries(cambios).map(([k, v]) => [k, String(v)])) as Partial<Record<ClaveAjuste, string>>
    if (textos.telefono_negocio) {
      if (!this.telefonos.normalizar) throw new Error("El módulo de clientas no se conectó a admin (ajustes.conectarTelefonos)")
      const telefono = this.telefonos.normalizar(textos.telefono_negocio, textos.codigo_area_negocio ?? (await this.leer.codigoDeArea()))
      if (!telefono) throw invalido("El WhatsApp del local no parece un teléfono válido.")
      textos.telefono_negocio = telefono
    }
    await this.repo.guardar(textos)
    if (textos.codigo_area_negocio !== undefined) this.leer.olvidarCodigoArea()
    return this.repo.leer()
  }
}

/** Lo que la web pública puede saber del local: contacto, reglas de reserva y la seña. */
export class VerAjustesPublicos {
  constructor(
    private leer: LeerAjustes,
    private mercadoPago: MercadoPagoDelLocal,
  ) {}

  async ejecutar() {
    const a = await this.leer.todos()
    const [conectado, publicKey] = await Promise.all([this.mercadoPago.conectado(), this.mercadoPago.publicKey()])
    return {
      nombre: a.nombre_negocio ?? "",
      telefono: a.telefono_negocio ?? "",
      direccion: a.direccion_negocio ?? "",
      email: a.email_negocio ?? "",
      cancelacionHoras: comoNumero(a, "cancelacion_horas_minimas"),
      reservaMinHoras: comoNumero(a, "reserva_anticipacion_min_horas"),
      reservaMaxDias: comoNumero(a, "reserva_anticipacion_max_dias"),
      // Misma regla que al reservar (ReservarTurno): sin Mercado Pago conectado no se cobra seña.
      senaPorcentaje: conectado ? comoNumero(a, "sena_porcentaje") : 0,
      mercadopagoPublicKey: publicKey,
    }
  }
}
