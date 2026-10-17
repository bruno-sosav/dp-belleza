-- V9: sena de los turnos con Mercado Pago.
--
-- La duena elige que porcentaje del precio se cobra de sena al reservar desde
-- la web (Ajustes -> Mercado Pago). 0 = sin sena. Solo se cobra si Mercado
-- Pago esta conectado.
--
-- Un turno con sena nace 'reservado' con sena_estado = 'pendiente' y un plazo
-- para pagar (sena_vence_at). Mientras no venza, ocupa el horario. Si vence
-- sin pagar, el sistema lo cancela (cancelado_por = 'sistema') y el horario se
-- libera. Al aprobarse el pago pasa a 'confirmado' con sena_estado = 'pagada'.
--
-- sena_token: lo que viaja en la URL de vuelta de Mercado Pago para que la web
-- muestre el resultado del pago sin pedir el telefono. Es aleatorio (el id del
-- turno es correlativo y se adivina).

INSERT IGNORE INTO configuracion (clave, valor, descripcion) VALUES
    ('sena_porcentaje', '0', 'Porcentaje del precio que se cobra de seña al reservar desde la web (0 = sin seña)');

ALTER TABLE turnos
    MODIFY COLUMN cancelado_por ENUM('local', 'clienta', 'sistema') NULL,
    ADD COLUMN sena_monto DECIMAL(10,2) NULL AFTER precio,
    ADD COLUMN sena_estado ENUM('pendiente', 'pagada', 'vencida') NULL AFTER sena_monto,
    ADD COLUMN sena_vence_at DATETIME NULL AFTER sena_estado,
    ADD COLUMN sena_token CHAR(32) NULL AFTER sena_vence_at,
    ADD COLUMN sena_pago_id BIGINT UNSIGNED NULL AFTER sena_token,
    ADD CONSTRAINT uq_turnos_sena_token UNIQUE (sena_token),
    ADD INDEX idx_turnos_sena_pendiente (sena_estado, sena_vence_at);
