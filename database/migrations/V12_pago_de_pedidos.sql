-- V12: pago de los pedidos de la tienda con Mercado Pago.
--
-- Si el local tiene Mercado Pago conectado, el pedido nace con
-- pago_estado = 'pendiente' y un pago_token: la clienta va a Mercado Pago y, al
-- aprobarse el pago, el pedido pasa solo a 'confirmado' con
-- pago_estado = 'pagado'. Sin Mercado Pago, pago_estado queda NULL y el pago se
-- coordina por WhatsApp, como hasta ahora.
--
-- pago_token: lo que viaja en la URL de vuelta de Mercado Pago para que la web
-- muestre el resultado sin pedir el teléfono. Es aleatorio (el id del pedido es
-- correlativo y se adivina).
--
-- La plata que entra por un pedido va a la caja con concepto 'pedido'.

ALTER TABLE pedidos
    ADD COLUMN pago_estado ENUM('pendiente', 'pagado') NULL AFTER total,
    ADD COLUMN pago_token CHAR(32) NULL AFTER pago_estado,
    ADD COLUMN pago_id BIGINT UNSIGNED NULL AFTER pago_token,
    ADD CONSTRAINT uq_pedidos_pago_token UNIQUE (pago_token);

ALTER TABLE cobros
    MODIFY COLUMN concepto ENUM('sena', 'turno', 'pedido', 'otro') NOT NULL,
    ADD COLUMN pedido_id INT UNSIGNED NULL AFTER turno_id,
    ADD CONSTRAINT fk_cobros_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE SET NULL,
    ADD INDEX idx_cobros_pedido (pedido_id);
