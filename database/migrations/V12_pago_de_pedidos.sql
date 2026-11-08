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
