-- seed__horarios_atencion: agenda semanal del local.
--
-- CONVENCION DE DIAS: ISO 8601 -> 1 = lunes ... 7 = domingo.
-- El CHECK de V1 es `dia_semana BETWEEN 1 AND 7`, que descarta el 0, asi que no
-- se puede usar la convencion de JavaScript (getDay(), donde 0 = domingo).
-- El backend convierte: diaIso = getDay() === 0 ? 7 : getDay().
--
-- Domingo no tiene fila: el local no atiende. "Sin horario" = cerrado.
--
-- Estos horarios salen de openingHours en el mock del front
-- (frontend/cliente/src/turnera/data/availability.ts), para que la agenda real
-- arranque igual a la que la UI ya venia mostrando.

INSERT INTO horarios_atencion (dia_semana, hora_inicio, hora_fin) VALUES
    (1, '09:00:00', '19:00:00'),   -- lunes
    (2, '09:00:00', '19:00:00'),   -- martes
    (3, '09:00:00', '19:00:00'),   -- miercoles
    (4, '09:00:00', '20:00:00'),   -- jueves
    (5, '09:00:00', '20:00:00'),   -- viernes
    (6, '10:00:00', '15:00:00');   -- sabado
