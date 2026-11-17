-- V14: gift cards. Se compran en la web (con Mercado Pago) o en el local (la
-- dueña la carga en el panel), y se usan en la tienda online o en el local.
--
-- `gift_cards`: el código, cuánto se cargó y cuánto le queda.
--   estado   'pendiente_pago'  comprada en la web, esperando el pago
--            'activa'          se puede usar mientras tenga saldo
--            'anulada'         la dueña la dio de baja
--   origen   'web' o 'local'
--   codigo   8 caracteres sin los que se confunden (0/O, 1/I): se muestra XXXX-XXXX
--
-- `gift_card_movimientos`: cada carga, uso, reintegro (pedido cancelado, cobro
-- borrado) o anulación, con el saldo que quedó. Es el historial que ve la dueña.
--
-- Plata de la caja: al VENDER la gift card entra un cobro (concepto 'gift_card');
-- al USARLA en el local el cobro es con medio 'gift_card' y no suma al total del
-- día, porque esa plata ya había entrado cuando se vendió.

CREATE TABLE gift_cards (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    codigo              CHAR(8) NOT NULL,
    monto               DECIMAL(10,2) NOT NULL,
    saldo               DECIMAL(10,2) NOT NULL,
    estado              ENUM('pendiente_pago', 'activa', 'anulada') NOT NULL,
    origen              ENUM('web', 'local') NOT NULL,
    comprador_nombre    VARCHAR(100) NOT NULL,
    comprador_telefono  VARCHAR(20) NULL,
    comprador_email     VARCHAR(150) NULL,
    para_nombre         VARCHAR(100) NULL,
    mensaje             VARCHAR(300) NULL,
    pago_token          CHAR(32) NULL,
    pago_id             BIGINT UNSIGNED NULL,
    activada_at         DATETIME NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_gift_cards_codigo UNIQUE (codigo),
    CONSTRAINT uq_gift_cards_pago_token UNIQUE (pago_token),
    CONSTRAINT chk_gift_cards_monto CHECK (monto > 0),
    CONSTRAINT chk_gift_cards_saldo CHECK (saldo >= 0 AND saldo <= monto),
    INDEX idx_gift_cards_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE gift_card_movimientos (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    gift_card_id    INT UNSIGNED NOT NULL,
    fecha_hora      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tipo            ENUM('carga', 'uso', 'reintegro', 'anulacion') NOT NULL,
    monto           DECIMAL(10,2) NOT NULL,
    saldo_despues   DECIMAL(10,2) NOT NULL,
    pedido_id       INT UNSIGNED NULL,
    descripcion     VARCHAR(255) NULL,
    CONSTRAINT chk_gc_mov_monto CHECK (monto >= 0),
    CONSTRAINT fk_gc_mov_gift_card FOREIGN KEY (gift_card_id) REFERENCES gift_cards(id) ON DELETE CASCADE,
    CONSTRAINT fk_gc_mov_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE SET NULL,
    INDEX idx_gc_mov_gift_card (gift_card_id, fecha_hora)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- La caja: la venta de una gift card es un concepto más; usarla, un medio más.
ALTER TABLE cobros
    MODIFY COLUMN medio ENUM('efectivo', 'debito', 'credito', 'transferencia', 'mercadopago', 'gift_card') NOT NULL,
    MODIFY COLUMN concepto ENUM('sena', 'turno', 'pedido', 'gift_card', 'otro') NOT NULL,
    ADD COLUMN gift_card_id INT UNSIGNED NULL AFTER pedido_id,
    ADD CONSTRAINT fk_cobros_gift_card FOREIGN KEY (gift_card_id) REFERENCES gift_cards(id) ON DELETE SET NULL;

-- Un pedido de la tienda pagado (todo o en parte) con una gift card.
ALTER TABLE pedidos
    ADD COLUMN gift_card_id INT UNSIGNED NULL AFTER pago_id,
    ADD COLUMN gift_card_monto DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER gift_card_id,
    ADD CONSTRAINT fk_pedidos_gift_card FOREIGN KEY (gift_card_id) REFERENCES gift_cards(id) ON DELETE SET NULL;
