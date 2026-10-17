-- V5__recordatorios: varios tipos de recordatorio, cada uno con su anticipacion
-- y su mensaje.
--
-- Hasta V4 habia UN solo recordatorio por turno: una fila en `recordatorios`
-- que la API dejaba "programada" al reservar (24 hs antes), con el texto y las
-- horas en `configuracion`. La duena quiere varios: por ejemplo una
-- confirmacion 48 hs antes y un recordatorio 24 hs antes, cada uno con su texto.
--
-- Cambia el modelo:
--   - `tipos_recordatorio`: los que configura la duena (nombre, horas antes,
--     mensaje). Son reglas, no filas por turno.
--   - Quien tiene que recibir cada uno se CALCULA en el momento (turnos pedidos
--     que entran en la ventana del tipo). Asi, si la duena cambia las horas, la
--     lista se acomoda sola, sin recalcular una cola.
--   - `recordatorios` pasa a ser el registro de lo que ya se hizo: una fila por
--     (turno, tipo) cuando se manda ('enviado') o se descarta ('omitido').

CREATE TABLE tipos_recordatorio (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    horas_antes     SMALLINT UNSIGNED NOT NULL,
    mensaje         TEXT NOT NULL,
    activo          TINYINT(1) NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_tipos_recordatorio_horas CHECK (horas_antes BETWEEN 1 AND 168)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- El recordatorio que ya existia pasa a ser el primer tipo, con el texto y las
-- horas que tenia cargados.
INSERT INTO tipos_recordatorio (nombre, horas_antes, mensaje)
SELECT 'Recordatorio del turno',
       COALESCE((SELECT CAST(valor AS UNSIGNED) FROM configuracion WHERE clave = 'recordatorio_horas_antes'), 24),
       COALESCE((SELECT valor FROM configuracion WHERE clave = 'recordatorio_mensaje'),
                'Hola {nombre}! Te recordamos tu turno de {servicio} el {fecha} a las {hora}. ¡Te esperamos!');

DELETE FROM configuracion WHERE clave IN ('recordatorio_horas_antes', 'recordatorio_mensaje');

-- Las filas "pendiente" eran la cola vieja: ya no significan nada (lo pendiente
-- se calcula). Las canceladas tampoco. Solo quedan las enviadas, si hubiera.
DELETE FROM recordatorios WHERE estado IN ('pendiente', 'cancelado', 'fallido');

ALTER TABLE recordatorios
    ADD COLUMN tipo_id INT UNSIGNED NULL AFTER turno_id,
    MODIFY COLUMN estado ENUM('enviado', 'omitido') NOT NULL DEFAULT 'enviado',
    MODIFY COLUMN programado_para DATETIME NULL,
    ADD CONSTRAINT fk_recordatorios_tipo
        FOREIGN KEY (tipo_id) REFERENCES tipos_recordatorio(id) ON DELETE CASCADE,
    -- Un mismo aviso no se registra dos veces para el mismo turno.
    ADD UNIQUE INDEX uq_recordatorios_turno_tipo (turno_id, tipo_id);

UPDATE recordatorios SET tipo_id = (SELECT MIN(id) FROM tipos_recordatorio) WHERE tipo_id IS NULL;
