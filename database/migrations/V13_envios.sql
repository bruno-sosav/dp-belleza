-- V13: envíos de la tienda por Andreani.
--
-- Hasta ahora la dirección de envío viajaba en pedidos.notas y el costo se
-- coordinaba por WhatsApp. Ahora un pedido con envío tiene su fila en `envios`
-- (un pedido sin fila = retira en el local) y el costo se suma al total.
--
--   proveedor  'andreani' con la cuenta del local; 'prueba' simula a Andreani
--              (para desarrollo y la demo, mientras no haya cuenta)
--   estado     a_despachar → despachado (se generó el envío) → entregado
--
-- La configuración (si hay envíos, desde cuánto es gratis, el código postal de
-- origen y el peso por unidad) va en `configuracion`. Las credenciales de la
-- API de Andreani van aparte, en `andreani_cuenta`, con la contraseña cifrada.

CREATE TABLE envios (
    pedido_id           INT UNSIGNED PRIMARY KEY,
    calle               VARCHAR(200) NOT NULL,          -- calle y número, piso, depto
    ciudad              VARCHAR(100) NOT NULL,
    provincia           VARCHAR(60)  NOT NULL,
    codigo_postal       VARCHAR(8)   NOT NULL,          -- 4 dígitos (el CP viejo)
    costo               DECIMAL(10,2) NOT NULL,         -- lo que pagó la clienta (0 = gratis)
    plazo_dias          TINYINT UNSIGNED NULL,          -- días hábiles que estimó Andreani
    proveedor           ENUM('andreani', 'prueba') NOT NULL,
    estado              ENUM('a_despachar', 'despachado', 'entregado') NOT NULL DEFAULT 'a_despachar',
    numero_seguimiento  VARCHAR(40) NULL,
    despachado_at       DATETIME NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_envios_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    CONSTRAINT chk_envios_costo CHECK (costo >= 0),
    INDEX idx_envios_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE andreani_cuenta (
    id                  TINYINT UNSIGNED PRIMARY KEY DEFAULT 1,
    usuario             VARCHAR(100) NOT NULL,
    password_cifrado    TEXT NOT NULL,                  -- AES-GCM (backend/src/core/seguridad/cifrado.util.ts)
    cliente             VARCHAR(30) NOT NULL,           -- número de cliente de Andreani
    contrato            VARCHAR(30) NOT NULL,           -- contrato de envío a domicilio
    entorno             ENUM('qa', 'produccion') NOT NULL DEFAULT 'qa',
    verificada_at       DATETIME NULL,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_andreani_una_sola CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO configuracion (clave, valor, descripcion) VALUES
    ('envio_modo', 'desactivado', 'Envíos de la tienda: desactivado (solo retiro), prueba (simula Andreani) o andreani'),
    ('envio_gratis_desde', '0', 'Monto de productos desde el que el envío es gratis (0 = nunca)'),
    ('envio_cp_origen', '', 'Código postal desde donde se despacha'),
    ('envio_peso_unidad_g', '300', 'Peso estimado por unidad, en gramos, para cotizar');
