-- V7: la clienta puede cancelar su turno desde la web ("Mi turno").
--
-- - `cancelacion_horas_minimas`: hasta cuántas horas antes del turno puede
--   cancelar ella sola. Pasado ese límite, la web le ofrece escribir por
--   WhatsApp. La duena lo cambia en el panel (Turnos -> Reglas).
-- - `turnos.cancelado_por` / `cancelado_at`: quién lo canceló y cuándo, para
--   que el panel muestre "lo canceló la clienta desde la web" y no parezca
--   que se borró solo.

INSERT IGNORE INTO configuracion (clave, valor, descripcion) VALUES
    ('cancelacion_horas_minimas', '24', 'Hasta cuántas horas antes del turno la clienta puede cancelar desde la web');

ALTER TABLE turnos
    ADD COLUMN cancelado_por ENUM('local', 'clienta') NULL AFTER estado,
    ADD COLUMN cancelado_at DATETIME NULL AFTER cancelado_por;

-- Los que ya estaban cancelados los cancelo el local: hasta ahora era la unica forma.
UPDATE turnos SET cancelado_por = 'local', cancelado_at = updated_at WHERE estado = 'cancelado';
