/**
 * Stock de los productos de la tienda. Dominio puro: tipos y reglas, sin base
 * de datos. El inventario es el ÚNICO dueño del stock: lo descuenta al vender,
 * lo devuelve al cancelar y lo repone o ajusta la dueña.
 */

/** Cuántas unidades de un producto. */
export type Linea = { productoId: number; cantidad: number }

/** Por qué no se puede vender una línea. Es la forma que ya devolvía el checkout. */
export type ProblemaDeStock = { productoId: number; motivo: string }

/**
 * Qué líneas no se pueden vender con el stock que hay. Vacío = se puede todo.
 *
 * @param stock unidades disponibles por producto (los que no están, no existen)
 */
export function problemasDeStock(lineas: Linea[], stock: Map<number, number>): ProblemaDeStock[] {
  const problemas: ProblemaDeStock[] = []
  for (const l of lineas) {
    const hay = stock.get(l.productoId)
    if (hay === undefined) problemas.push({ productoId: l.productoId, motivo: "no disponible" })
    else if (hay < l.cantidad) problemas.push({ productoId: l.productoId, motivo: `stock insuficiente (quedan ${hay})` })
  }
  return problemas
}

/** El conteo que carga la dueña tiene que ser un entero que no sea negativo. */
export const conteoValido = (n: number) => Number.isInteger(n) && n >= 0
