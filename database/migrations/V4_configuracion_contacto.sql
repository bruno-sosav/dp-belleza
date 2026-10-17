-- V4__configuracion: datos de contacto del local, editables desde el panel.
--
-- La web publica tenia la direccion, el email y el WhatsApp escritos en el
-- codigo (con un numero de prueba). Pasan a `configuracion`, junto a
-- `telefono_negocio` y `nombre_negocio` que ya existian, asi la duena los
-- cambia desde Ajustes y la web los lee de GET /api/configuracion.
--
-- INSERT IGNORE: si alguien ya cargo la clave a mano, no se pisa.

INSERT IGNORE INTO configuracion (clave, valor, descripcion) VALUES
    ('direccion_negocio', '', 'Dirección del local, como se muestra en la web'),
    ('email_negocio', '', 'Email de contacto que se muestra en la web');
