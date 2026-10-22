/** Lo que SALE por HTTP del inventario: el producto y cómo quedó su stock. */
export const aStock = (productoId: number, stock: number) => ({ productoId, stock })
