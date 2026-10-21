/**
 * Controller de clientas (la "C" de MVC): toma el pedido HTTP, valida con los
 * schemas, llama al caso de uso y devuelve el DTO. No tiene reglas de negocio
 * ni SQL.
 */
import type { Request, Response } from "express"
import type {
  ActualizarCliente,
  BuscarPosiblesDuplicados,
  CrearCliente,
  EliminarCliente,
  ListarClientes,
  UnirClientes,
  VerFichaCliente,
} from "../../application/clientes.usecases.js"
import { aCliente, aClienteEnLista, aFicha, aFichaCorta, aUnion } from "../dto/clientes.dto.js"
import { busqueda, cambiosCliente, idParam, nuevaCliente, unir } from "../schemas/clientes.schema.js"

export type CasosDeUsoClientes = {
  listar: ListarClientes
  verFicha: VerFichaCliente
  crear: CrearCliente
  actualizar: ActualizarCliente
  eliminar: EliminarCliente
  posiblesDuplicados: BuscarPosiblesDuplicados
  unir: UnirClientes
}

export class ClientesController {
  constructor(private casos: CasosDeUsoClientes) {}

  listar = async (req: Request, res: Response) => {
    const { q } = busqueda.parse(req.query)
    res.json((await this.casos.listar.ejecutar(q)).map(aClienteEnLista))
  }

  ficha = async (req: Request, res: Response) => {
    res.json(aFicha(await this.casos.verFicha.ejecutar(idParam.parse(req.params.id))))
  }

  crear = async (req: Request, res: Response) => {
    res.status(201).json(aCliente(await this.casos.crear.ejecutar(nuevaCliente.parse(req.body))))
  }

  actualizar = async (req: Request, res: Response) => {
    res.json(aCliente(await this.casos.actualizar.ejecutar(idParam.parse(req.params.id), cambiosCliente.parse(req.body))))
  }

  eliminar = async (req: Request, res: Response) => {
    await this.casos.eliminar.ejecutar(idParam.parse(req.params.id))
    res.status(204).end()
  }

  posiblesDuplicados = async (req: Request, res: Response) => {
    res.json((await this.casos.posiblesDuplicados.ejecutar(idParam.parse(req.params.id))).map(aFichaCorta))
  }

  unir = async (req: Request, res: Response) => {
    const id = idParam.parse(req.params.id)
    const { otraId, telefonoDe } = unir.parse(req.body)
    res.json(aUnion(id, await this.casos.unir.ejecutar(id, otraId, telefonoDe)))
  }
}
