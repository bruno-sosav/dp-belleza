-- V8: codigo de area del local.
--
-- Las clientas escriben el telefono como lo dicen en voz alta, y muchas veces
-- sin codigo de area ("15 555-1234", "495-1234") porque son de la misma
-- ciudad. Con esto el backend completa el del local (shared/telefonoLocal.ts).
-- La duena lo cambia en Ajustes -> Tu negocio.

INSERT IGNORE INTO configuracion (clave, valor, descripcion) VALUES
    ('codigo_area_negocio', '223', 'Código de área del local, para los teléfonos que se escriben sin él');
