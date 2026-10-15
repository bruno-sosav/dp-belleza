-- seed__turnos próximos: la agenda de hoy y de las próximas dos semanas.
--
-- SOLO PARA DESARROLLO Y DEMO. No correr en producción: inventa turnos.
--
-- seed_03 carga el historial (lo que ya pasó). Esto carga lo que viene, para
-- que la pantalla de inicio del panel tenga turnos que atender: reservados,
-- algunos ya confirmados y alguna cancelación.
--
-- Requiere V1, V2, seed_01, seed_02 y las clientas de seed_03.

INSERT INTO turnos (cliente_id, servicio_id, fecha_hora_inicio, fecha_hora_fin, precio, estado)
WITH
-- hoy (0) y los 13 días siguientes
numeros AS (
    SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
    UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
    UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13
),
dias AS (
    SELECT n, DATE_ADD(CURDATE(), INTERVAL n DAY) AS fecha FROM numeros
),
-- mismas franjas de 90 minutos que seed_03, así no se pisan entre sí
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
    1 + ((d.n * 5 + f.n * 3) % 8),
    srv.id,
    TIMESTAMP(d.fecha, SEC_TO_TIME((a.inicio_min + f.n * 90) * 60)),
    TIMESTAMP(d.fecha, SEC_TO_TIME((a.inicio_min + f.n * 90 + srv.duracion_min) * 60)),
    srv.precio,
    CASE
        WHEN (d.n * 3 + f.n * 7) % 10 = 0                 THEN 'cancelado'
        -- lo de los próximos días ya suele estar confirmado; lo lejano, no
        WHEN d.n <= 2 AND (d.n * 3 + f.n * 7) % 10 < 7     THEN 'confirmado'
        ELSE 'reservado'
    END
FROM dias d
CROSS JOIN franjas f
-- IF(...) convierte DAYOFWEEK (1=domingo) a la convención ISO de la tabla (7=domingo)
JOIN agenda a ON a.dia_semana = IF(DAYOFWEEK(d.fecha) = 1, 7, DAYOFWEEK(d.fecha) - 1)
JOIN servicios srv ON srv.id = 1 + ((d.n * 7 + f.n * 5) % 14)
WHERE a.inicio_min + f.n * 90 + srv.duracion_min <= a.fin_min
  -- solo lo que todavía no empezó
  AND TIMESTAMP(d.fecha, SEC_TO_TIME((a.inicio_min + f.n * 90) * 60)) > NOW()
  -- la agenda se va vaciando hacia adelante, como pasa de verdad
  AND (d.n * 7 + f.n * 11) % 10 < GREATEST(3, 9 - d.n DIV 2);

-- Recordatorios de esos turnos, como los deja la API al reservar
-- (src/turnera/service.ts, programarRecordatorio): X horas antes, y solo si
-- esa hora todavía no pasó.
INSERT INTO recordatorios (turno_id, programado_para)
SELECT id, programado_para
  FROM (
      SELECT t.id,
             DATE_SUB(t.fecha_hora_inicio, INTERVAL (
                 SELECT CAST(valor AS UNSIGNED) FROM configuracion WHERE clave = 'recordatorio_horas_antes'
             ) HOUR) AS programado_para
        FROM turnos t
       WHERE t.fecha_hora_inicio > NOW()
         AND t.estado IN ('reservado', 'confirmado')
         AND NOT EXISTS (SELECT 1 FROM recordatorios r WHERE r.turno_id = t.id)
  ) x
 WHERE programado_para > NOW();
