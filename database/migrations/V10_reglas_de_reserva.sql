-- V10: reglas de reserva desde la web y un token por reserva.
--
-- - reserva_anticipacion_min_horas: con cuánta anticipación como mínimo se
--   puede reservar (que nadie reserve un turno que empieza en 5 minutos).
-- - reserva_anticipacion_max_dias: hasta cuántos días para adelante.
--   Las dos las elige la dueña en Turnos -> Reglas.
-- - turnos.token_publico: identifica la reserva en la URL de la confirmación
--   (/reserva-confirmada?t=...), así la pantalla sobrevive a un F5. Es
--   aleatorio porque el id del turno es correlativo y se adivina.

INSERT IGNORE INTO configuracion (clave, valor, descripcion) VALUES
    ('reserva_anticipacion_min_horas', '2', 'Con cuántas horas de anticipación como mínimo se puede reservar desde la web'),
    ('reserva_anticipacion_max_dias', '60', 'Hasta cuántos días para adelante se puede reservar desde la web');

ALTER TABLE turnos
    ADD COLUMN token_publico CHAR(32) NULL AFTER sena_pago_id,
    ADD CONSTRAINT uq_turnos_token_publico UNIQUE (token_publico);
