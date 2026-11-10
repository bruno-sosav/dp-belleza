/**
 * API REST de Andreani (sin SDK), con la cuenta del local.
 *
 * ⚠️ Escrito según la API pública de Andreani (login con Basic auth que devuelve
 * el header x-authorization-token; /v1/tarifas; /v2/ordenes-de-envio;
 * /v2/envios/{numero}/trazas). Cuando el local tenga su cuenta hay que
 * verificarlo contra la documentación de developers.andreani.com, primero en el
 * entorno de pruebas (apisqa): los nombres de campos son lo primero a revisar.
 * Mientras tanto, la tienda usa el modo prueba (prueba.transportista.ts).
 */
import { externo, invalido } from "../../../core/negocio.error.js"
import type { EventoDeSeguimiento } from "../models/envio.model.js"
import type { CuentaAndreani, CuentaAndreaniRepository, DatosDeDespacho, FuenteDeAjustes, Transportista } from "../models/envios.ports.js"

const BASE = { qa: "https://apisqa.andreani.com", produccion: "https://apis.andreani.com" } as const

/** El token dura 24 horas: se guarda en memoria y se renueva un rato antes. */
const tokens = new Map<string, { token: string; hasta: number }>()

async function pedir(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) })
  } catch {
    throw externo("No se pudo conectar con Andreani. Probá de nuevo en un rato.")
  }
}

/** Login: Basic auth con usuario y contraseña; el token vuelve en el header x-authorization-token. */
export async function loginAndreani(c: CuentaAndreani): Promise<string> {
  const clave = `${c.entorno}:${c.usuario}`
  const guardado = tokens.get(clave)
  if (guardado && guardado.hasta > Date.now()) return guardado.token
  const respuesta = await pedir(`${BASE[c.entorno]}/login`, {
    headers: { Authorization: `Basic ${Buffer.from(`${c.usuario}:${c.password}`).toString("base64")}` },
  })
  if (respuesta.status === 401 || respuesta.status === 403) throw invalido("Andreani rechazó el usuario o la contraseña.")
  const token = respuesta.headers.get("x-authorization-token")
  if (!respuesta.ok || !token) throw externo(`Andreani no respondió el login como se esperaba (${respuesta.status}).`)
  tokens.set(clave, { token, hasta: Date.now() + 23 * 3_600_000 })
  return token
}

async function llamar<T>(c: CuentaAndreani, ruta: string, init: RequestInit = {}): Promise<T> {
  const token = await loginAndreani(c)
  const respuesta = await pedir(`${BASE[c.entorno]}${ruta}`, {
    ...init,
    headers: { "x-authorization-token": token, "Content-Type": "application/json", ...init.headers },
  })
  const datos = await respuesta.json().catch(() => null)
  if (!respuesta.ok) {
    const detalle = datos?.detail ?? datos?.title ?? datos?.message
    throw externo(`Andreani respondió con un error (${respuesta.status}${detalle ? `: ${detalle}` : ""}).`)
  }
  return datos as T
}

type Tarifa = { tarifaConIva?: { total?: string | number } }
type Orden = { bultos?: { numeroDeEnvio?: string }[]; agrupadorDeBultos?: string }
type Trazas = { eventos?: { Fecha?: string; Estado?: string; Motivo?: string; Sucursal?: string }[] }

export class TransportistaAndreani implements Transportista {
  readonly proveedor = "andreani" as const

  constructor(
    private cuentas: CuentaAndreaniRepository,
    private ajustes: FuenteDeAjustes,
  ) {}

  private async cuenta(): Promise<CuentaAndreani> {
    const c = await this.cuentas.leer()
    if (!c) throw invalido("Andreani no está configurado. Cargá la cuenta en Ajustes → Envíos.")
    return c
  }

  async cotizar(_cpOrigen: string, cpDestino: string, bulto: { kilos: number; volumenCm3: number; valorDeclarado: number }) {
    const c = await this.cuenta()
    const q = new URLSearchParams({
      cpDestino,
      contrato: c.contrato,
      cliente: c.cliente,
      "bultos[0][valorDeclarado]": String(bulto.valorDeclarado),
      "bultos[0][volumen]": String(bulto.volumenCm3),
      "bultos[0][kilos]": String(bulto.kilos),
    })
    const t = await llamar<Tarifa>(c, `/v1/tarifas?${q}`)
    const total = Number(t.tarifaConIva?.total)
    if (!Number.isFinite(total) || total <= 0) throw externo("Andreani no devolvió una tarifa para ese código postal.")
    // La tarifa no trae plazo: el panel lo muestra como "a confirmar".
    return { costo: total, plazoDias: null }
  }

  async despachar(cpOrigen: string, d: DatosDeDespacho) {
    const [c, remitente] = await Promise.all([this.cuenta(), this.ajustes.remitente()])
    const orden = await llamar<Orden>(c, "/v2/ordenes-de-envio", {
      method: "POST",
      body: JSON.stringify({
        contrato: c.contrato,
        origen: { postal: { codigoPostal: cpOrigen, calle: remitente.direccion, numero: "", localidad: "", pais: "Argentina" } },
        destino: { postal: { codigoPostal: d.destino.codigoPostal, calle: d.destino.calle, numero: "", localidad: d.destino.ciudad, region: d.destino.provincia, pais: "Argentina" } },
        remitente: { nombreCompleto: remitente.nombre, email: remitente.email, telefonos: [{ tipo: 1, numero: remitente.telefono }] },
        destinatario: [{ nombreCompleto: d.destinatario.nombre, email: d.destinatario.email ?? "", telefonos: [{ tipo: 2, numero: d.destinatario.telefono }] }],
        bultos: [{ kilos: d.bulto.kilos, volumenCm: d.bulto.volumenCm3, valorDeclaradoConImpuestos: d.bulto.valorDeclarado, referencias: [{ meta: "idCliente", contenido: `pedido-${d.pedidoId}` }] }],
      }),
    })
    const numero = orden.bultos?.[0]?.numeroDeEnvio ?? orden.agrupadorDeBultos
    if (!numero) throw externo("Andreani creó la orden pero no devolvió el número de envío.")
    return { numero }
  }

  async seguimiento(numero: string): Promise<EventoDeSeguimiento[]> {
    const c = await this.cuenta()
    const t = await llamar<Trazas>(c, `/v2/envios/${encodeURIComponent(numero)}/trazas`)
    return (t.eventos ?? []).map((e) => ({
      fecha: String(e.Fecha ?? "").replace("T", " ").slice(0, 16),
      estado: e.Estado ?? "Sin estado",
      detalle: [e.Motivo, e.Sucursal].filter(Boolean).join(" · ") || null,
    }))
  }
}
