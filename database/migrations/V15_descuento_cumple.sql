-- V15: descuento de cumpleaños en la tienda online.
--
-- Si la clienta tiene su cumpleaños cargado en la ficha (clientes.cumple_mes),
-- durante todo ese mes la tienda le descuenta un % de los productos (no del
-- envío). Una compra por año: un pedido cancelado no cuenta como usada.
-- El % lo elige la dueña en Ajustes; 0 = sin descuento (el valor inicial).
--
-- `pedidos.descuento_cumple`: cuánto se descontó. `pedidos.total` ya viene con
-- el descuento aplicado (es lo que se cobra).

ALTER TABLE pedidos
    ADD COLUMN descuento_cumple DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER total;

INSERT IGNORE INTO configuracion (clave, valor, descripcion) VALUES
    ('descuento_cumple_porcentaje', '0', '% de descuento en la tienda durante el mes del cumpleaños de la clienta (0 = sin descuento). Una compra por año');
