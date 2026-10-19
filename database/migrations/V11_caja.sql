-- V11: caja. Cada fila de `cobros` es plata que entró: cuánto, cómo y por qué.
--
-- Hasta ahora Finanzas sumaba el PRECIO de los turnos completados, que no es lo
-- mismo que lo cobrado: no se sabía si se pagó en efectivo, con débito o por
-- Mercado Pago, ni se contaban las señas de las clientas que después no vinieron.
--
--   concepto  'sena'  seña de un turno (las de Mercado Pago entran solas)
--             'turno' lo que se cobró al terminar el turno
--             'otro'  cualquier otra entrada que la dueña anota a mano
--   medio     efectivo, débito, crédito, transferencia o Mercado Pago
--
-- `mp_pago_id` es UNIQUE: el aviso de un pago de Mercado Pago puede llegar dos
-- veces (webhook y vuelta de la clienta) y tiene que entrar una sola.

CREATE TABLE cobros (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    fecha_hora      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    monto           DECIMAL(10,2) NOT NULL,
    medio           ENUM('efectivo', 'debito', 'credito', 'transferencia', 'mercadopago') NOT NULL,
    concepto        ENUM('sena', 'turno', 'otro') NOT NULL,
    turno_id        INT UNSIGNED NULL,
    cliente_id      INT UNSIGNED NULL,
    descripcion     VARCHAR(255) NULL,
    mp_pago_id      BIGINT UNSIGNED NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_cobros_monto CHECK (monto > 0),
    CONSTRAINT fk_cobros_turno FOREIGN KEY (turno_id) REFERENCES turnos(id) ON DELETE SET NULL,
    CONSTRAINT fk_cobros_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
    CONSTRAINT uq_cobros_mp_pago UNIQUE (mp_pago_id),
    INDEX idx_cobros_fecha (fecha_hora),
    INDEX idx_cobros_turno (turno_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Las señas que ya se pagaron por Mercado Pago entran a la caja.
INSERT IGNORE INTO cobros (fecha_hora, monto, medio, concepto, turno_id, cliente_id, mp_pago_id)
SELECT COALESCE(t.updated_at, NOW()), t.sena_monto, 'mercadopago', 'sena', t.id, t.cliente_id, t.sena_pago_id
  FROM turnos t
 WHERE t.sena_estado = 'pagada' AND t.sena_monto > 0;
