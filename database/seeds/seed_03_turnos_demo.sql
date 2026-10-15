-- seed__turnos de demostración: ~120 días de historial para que el panel de
-- estadísticas tenga algo que mostrar.
--
-- SOLO PARA DESARROLLO Y DEMO. No correr en producción: inventa turnos.
--
-- Reemplaza al generador que vivía en frontend/admin/src/data/history.ts, que
-- fabricaba los datos en el navegador con un hash. Ahora son filas de verdad en
-- la base, con sus clientes, y las estadísticas salen de SQL.
--
-- Requiere V1, V2 y seed_01_servicios + seed_02_horarios.

-- Clientas de ejemplo. Teléfonos ya normalizados, como los guarda la API
-- (549 + 10 dígitos, ver backend/src/shared/models/telefono.ts).
INSERT INTO clientes (nombre, apellido, telefono, email) VALUES
    ('Ana',       'Pérez',     '5492235550001', 'ana@example.com'),
    ('Camila',    'Rodríguez', '5492235550002', 'camila@example.com'),
    ('Valentina', 'Gómez',     '5492235550003', NULL),
    ('Lucía',     'Fernández', '5492235550004', 'lucia@example.com'),
    ('Martina',   'López',     '5492235550005', NULL),
    ('Sofía',     'Martínez',  '5492235550006', 'sofia@example.com'),
    ('Julieta',   'García',    '5492235550007', NULL),
    ('Paula',     'Sánchez',   '5492235550008', 'paula@example.com');

-- Turnos. Reglas que respeta:
--   - solo días en que el local atiende (tiene fila en horarios_atencion)
--   - el turno entra completo en el horario de ese día
--   - las franjas van cada 90 minutos y ningún servicio dura más que eso,
--     así que no se solapan entre sí
--   - nada en el futuro
--   - la mayoría quedan 'completado'; algunos 'cancelado' o 'ausente', para que
--     el panel tenga qué mostrar en esa métrica
INSERT INTO turnos (cliente_id, servicio_id, fecha_hora_inicio, fecha_hora_fin, precio, estado)
WITH
-- 0..119 días hacia atrás
numeros AS (
    SELECT a.n + b.n * 10 AS n
      FROM (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
            UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a
      CROSS JOIN (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                  UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
                  UNION ALL SELECT 10 UNION ALL SELECT 11) b
),
dias AS (
    SELECT n, DATE_SUB(CURDATE(), INTERVAL n DAY) AS fecha FROM numeros
),
-- hasta 4 turnos por día
franjas AS (
    SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
),
agenda AS (
    SELECT dia_semana,
           HOUR(hora_inicio) * 60 + MINUTE(hora_inicio) AS inicio_min,
           HOUR(hora_fin)    * 60 + MINUTE(hora_fin)    AS fin_min
      FROM horarios_atencion
)
SELECT
    1 + ((d.n * 7 + f.n * 3) % 8),
    srv.id,
    TIMESTAMP(d.fecha, SEC_TO_TIME((a.inicio_min + f.n * 90) * 60)),
    TIMESTAMP(d.fecha, SEC_TO_TIME((a.inicio_min + f.n * 90 + srv.duracion_min) * 60)),
    srv.precio,
    CASE
        WHEN (d.n * 13 + f.n * 5) % 100 < 88 THEN 'completado'
        WHEN (d.n * 13 + f.n * 5) % 100 < 95 THEN 'cancelado'
        ELSE 'ausente'
    END
FROM dias d
CROSS JOIN franjas f
-- IF(...) convierte DAYOFWEEK (1=domingo) a la convención ISO de la tabla (7=domingo)
JOIN agenda a ON a.dia_semana = IF(DAYOFWEEK(d.fecha) = 1, 7, DAYOFWEEK(d.fecha) - 1)
JOIN servicios srv ON srv.id = 1 + ((d.n * 5 + f.n * 3) % 14)
WHERE a.inicio_min + f.n * 90 + srv.duracion_min <= a.fin_min
  AND d.fecha <= CURDATE();
