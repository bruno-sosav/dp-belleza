-- V6: recordatorios despues de la visita y de cumpleanos, cumpleanos de las
-- clientas, y Mercado Pago.

-- ---------------------------------------------------------------- cumpleanos
-- Solo dia y mes: el ano casi nadie lo quiere dar, y para saludar o mandar una
-- promo no hace falta. Los dos juntos o ninguno.
ALTER TABLE clientes
    ADD COLUMN cumple_dia TINYINT UNSIGNED NULL AFTER email,
    ADD COLUMN cumple_mes TINYINT UNSIGNED NULL AFTER cumple_dia,
    ADD CONSTRAINT chk_clientes_cumple CHECK (
        (cumple_dia IS NULL AND cumple_mes IS NULL)
        OR (cumple_dia BETWEEN 1 AND 31 AND cumple_mes BETWEEN 1 AND 12)
    ),
    ADD INDEX idx_clientes_cumple (cumple_mes, cumple_dia);

-- ---------------------------------------------------------------- tipos de recordatorio
-- `momento` dice desde donde se cuenta:
--   antes       X horas antes de un turno pedido (lo que habia hasta V5)
--   despues     X dias despues de una visita completada ("¿renovamos?")
--   cumpleanos  X dias antes del cumpleanos de la clienta (0 = ese dia)
-- `horas_antes` queda para 'antes'; `dias` para los otros dos.
-- `servicio_id` (opcional, solo 'despues'): el recordatorio es solo para las
-- visitas de ese servicio, por ejemplo depilacion laser cada 21 dias.
ALTER TABLE tipos_recordatorio
    ADD COLUMN momento ENUM('antes', 'despues', 'cumpleanos') NOT NULL DEFAULT 'antes' AFTER nombre,
    MODIFY COLUMN horas_antes SMALLINT UNSIGNED NULL,
    ADD COLUMN dias SMALLINT UNSIGNED NULL AFTER horas_antes,
    ADD COLUMN servicio_id INT UNSIGNED NULL AFTER dias,
    DROP CHECK chk_tipos_recordatorio_horas,
    ADD CONSTRAINT chk_tipos_recordatorio_cuando CHECK (
        (momento = 'antes' AND horas_antes BETWEEN 1 AND 168)
        OR (momento = 'despues' AND dias BETWEEN 1 AND 365)
        OR (momento = 'cumpleanos' AND dias BETWEEN 0 AND 30)
    ),
    ADD CONSTRAINT fk_tipos_recordatorio_servicio
        FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------- registro de lo mandado
-- Un recordatorio de cumpleanos no tiene turno: se registra por clienta y ano
-- (asi el ano que viene vuelve a aparecer). Los de antes/despues siguen por
-- turno. Los UNIQUE con NULL no chocan entre si en MySQL, asi que cada indice
-- solo aplica a su caso.
ALTER TABLE recordatorios
    MODIFY COLUMN turno_id INT UNSIGNED NULL,
    ADD COLUMN cliente_id INT UNSIGNED NULL AFTER turno_id,
    ADD COLUMN anio SMALLINT UNSIGNED NULL AFTER cliente_id,
    ADD CONSTRAINT fk_recordatorios_cliente
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
    ADD UNIQUE INDEX uq_recordatorios_cumple (tipo_id, cliente_id, anio);

-- ---------------------------------------------------------------- Mercado Pago
-- Una sola cuenta (la del local). El access token va ENCRIPTADO con la clave
-- del backend (shared/cifrado.ts): si alguien se lleva un dump de la base, no
-- se lleva la llave para cobrar en nombre del local.
CREATE TABLE mercadopago_cuenta (
    id                  TINYINT UNSIGNED PRIMARY KEY DEFAULT 1,
    access_token_cifrado TEXT NOT NULL,
    public_key          VARCHAR(200) NOT NULL,
    webhook_secret_cifrado TEXT NULL,
    -- Para mostrar en el panel sin descifrar nada: "...a1b2", cuenta, modo.
    token_final         VARCHAR(8) NOT NULL,
    modo                ENUM('prueba', 'produccion') NOT NULL,
    cuenta_nombre       VARCHAR(200) NULL,
    verificada_at       DATETIME NULL,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_mercadopago_una_sola CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Lo que avisa Mercado Pago por el webhook. `referencia_externa` es lo que se
-- mando al crear el cobro (por ejemplo "pedido-15"): con eso el modulo que
-- cobro (la tienda) sabe que pedido se pago.
CREATE TABLE mercadopago_pagos (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pago_id             BIGINT UNSIGNED NOT NULL,
    estado              VARCHAR(40) NOT NULL,       -- approved, pending, rejected...
    estado_detalle      VARCHAR(100) NULL,
    monto               DECIMAL(10,2) NULL,
    referencia_externa  VARCHAR(100) NULL,
    datos               JSON NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_mercadopago_pagos_pago UNIQUE (pago_id),
    INDEX idx_mercadopago_pagos_ref (referencia_externa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
