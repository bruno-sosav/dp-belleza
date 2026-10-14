-- V1__crear_tablas.sql

SET NAMES utf8mb4;

-- 1. USUARIOS Y CLIENTES

-- Personas que entran al panel de administración
CREATE TABLE usuarios (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    email           VARCHAR(150) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,          -- nunca la contraseña en texto plano
    rol             ENUM('admin', 'empleado') NOT NULL DEFAULT 'admin',
    activo          TINYINT(1) NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_usuarios_email UNIQUE (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Clientes de la web (sin cuenta). Se identifican por teléfono:
-- si alguien vuelve a pedir con el mismo teléfono, se reutiliza el registro.
CREATE TABLE clientes (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    apellido        VARCHAR(100) NULL,
    telefono        VARCHAR(30)  NOT NULL,          -- guardar normalizado, ej: 5492231234567
    email           VARCHAR(150) NULL,
    notas           TEXT NULL,                      -- notas internas de la dueña
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_clientes_telefono UNIQUE (telefono)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. CATÁLOGO (E-COMMERCE)

CREATE TABLE categorias (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    activo          TINYINT(1) NOT NULL DEFAULT 1,
    CONSTRAINT uq_categorias_nombre UNIQUE (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE productos (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    categoria_id    INT UNSIGNED NULL,
    nombre          VARCHAR(150) NOT NULL,
    descripcion     TEXT NULL,
    precio          DECIMAL(10,2) NOT NULL,
    stock           INT UNSIGNED NOT NULL DEFAULT 0,
    imagen_url      VARCHAR(500) NULL,
    activo          TINYINT(1) NOT NULL DEFAULT 1,  -- 0 = no se muestra en la web
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_productos_categoria
        FOREIGN KEY (categoria_id) REFERENCES categorias(id),
    CONSTRAINT chk_productos_precio CHECK (precio >= 0),
    INDEX idx_productos_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. PEDIDOS

CREATE TABLE pedidos (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cliente_id      INT UNSIGNED NOT NULL,
    estado          ENUM('pendiente', 'confirmado', 'entregado', 'cancelado')
                    NOT NULL DEFAULT 'pendiente',
    total           DECIMAL(10,2) NOT NULL,
    notas           TEXT NULL,                      -- comentario del cliente al pedir
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pedidos_cliente
        FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    CONSTRAINT chk_pedidos_total CHECK (total >= 0),
    INDEX idx_pedidos_estado (estado),
    INDEX idx_pedidos_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE pedido_items (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pedido_id       INT UNSIGNED NOT NULL,
    producto_id     INT UNSIGNED NOT NULL,
    cantidad        INT UNSIGNED NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,         -- precio congelado al momento del pedido
    subtotal        DECIMAL(10,2) AS (cantidad * precio_unitario) STORED,
    CONSTRAINT fk_items_pedido
        FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    CONSTRAINT fk_items_producto
        FOREIGN KEY (producto_id) REFERENCES productos(id),
    CONSTRAINT chk_items_cantidad CHECK (cantidad > 0),
    CONSTRAINT chk_items_precio CHECK (precio_unitario >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. TURNERA (atiende solo la dueña)

CREATE TABLE servicios (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL,
    descripcion     TEXT NULL,
    duracion_min    SMALLINT UNSIGNED NOT NULL,     -- duración en minutos
    precio          DECIMAL(10,2) NOT NULL,
    activo          TINYINT(1) NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_servicios_duracion CHECK (duracion_min > 0),
    CONSTRAINT chk_servicios_precio CHECK (precio >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE horarios_atencion (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    dia_semana      TINYINT UNSIGNED NOT NULL,
    hora_inicio     TIME NOT NULL,
    hora_fin        TIME NOT NULL,
    CONSTRAINT chk_horarios_dia CHECK (dia_semana BETWEEN 1 AND 7),
    CONSTRAINT chk_horarios_rango CHECK (hora_fin > hora_inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Períodos en que no atiende: vacaciones, feriados, un rato puntual, etc.
CREATE TABLE bloqueos (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    fecha_hora_inicio   DATETIME NOT NULL,
    fecha_hora_fin      DATETIME NOT NULL,
    motivo              VARCHAR(255) NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_bloqueos_rango CHECK (fecha_hora_fin > fecha_hora_inicio),
    INDEX idx_bloqueos_rango (fecha_hora_inicio, fecha_hora_fin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE turnos (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cliente_id          INT UNSIGNED NOT NULL,
    servicio_id         INT UNSIGNED NOT NULL,
    fecha_hora_inicio   DATETIME NOT NULL,
    fecha_hora_fin      DATETIME NOT NULL,
    estado              ENUM('reservado', 'confirmado', 'completado', 'cancelado', 'ausente')
                        NOT NULL DEFAULT 'reservado',
    precio              DECIMAL(10,2) NOT NULL,     -- precio congelado al reservar
    notas               TEXT NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_turnos_cliente
        FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    CONSTRAINT fk_turnos_servicio
        FOREIGN KEY (servicio_id) REFERENCES servicios(id),
    CONSTRAINT chk_turnos_rango CHECK (fecha_hora_fin > fecha_hora_inicio),
    CONSTRAINT chk_turnos_precio CHECK (precio >= 0),
    INDEX idx_turnos_inicio (fecha_hora_inicio),
    INDEX idx_turnos_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 5. RECORDATORIOS Y CONFIGURACIÓN

CREATE TABLE recordatorios (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    turno_id            INT UNSIGNED NOT NULL,
    canal               ENUM('whatsapp') NOT NULL DEFAULT 'whatsapp',
    programado_para     DATETIME NOT NULL,
    estado              ENUM('pendiente', 'enviado', 'fallido', 'cancelado')
                        NOT NULL DEFAULT 'pendiente',
    intentos            TINYINT UNSIGNED NOT NULL DEFAULT 0,
    enviado_at          DATETIME NULL,
    error               TEXT NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_recordatorios_turno
        FOREIGN KEY (turno_id) REFERENCES turnos(id) ON DELETE CASCADE,
    INDEX idx_recordatorios_cola (estado, programado_para)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Parámetros editables desde el panel sin tocar código
CREATE TABLE configuracion (
    clave           VARCHAR(100) PRIMARY KEY,
    valor           TEXT NOT NULL,
    descripcion     VARCHAR(255) NULL,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO configuracion (clave, valor, descripcion) VALUES
    ('nombre_negocio', 'Dp.belleza', 'Nombre que aparece en web y mensajes'),
    ('telefono_negocio', '', 'WhatsApp del local'),
    ('recordatorio_horas_antes', '24', 'Cuántas horas antes del turno se envía el recordatorio'),
    ('recordatorio_mensaje',
     'Hola {nombre}! Te recordamos tu turno de {servicio} el {fecha} a las {hora}. Si no podés venir, avisanos. ¡Te esperamos!',
     'Plantilla del recordatorio. Variables: {nombre} {servicio} {fecha} {hora}'),
    ('intervalo_turnos_min', '15', 'Cada cuántos minutos se ofrecen horarios en la turnera');