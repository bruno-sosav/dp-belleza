-- V2__servicios: campos que el frontend ya usa y la tabla no tenia.
--
-- El tipo `Service` de frontend/shared/data/services.ts dice explicitamente
-- "Tratarlos como contrato, no como relleno", y 7 de sus 12 campos no existian
-- en `servicios`: la tabla no alcanzaba para dibujar las pantallas que ya estan
-- hechas. Esto las agrega.

ALTER TABLE servicios
    ADD COLUMN categoria ENUM(
        'Masajes', 'Facial', 'Corporal', 'Manos y Pies', 'Depilación', 'Pestañas y Cejas'
    ) NOT NULL AFTER nombre,
    ADD COLUMN descripcion_corta VARCHAR(255) NULL AFTER categoria,
    ADD COLUMN imagen_url VARCHAR(500) NULL AFTER descripcion,
    -- Lista de lo que incluye la sesion. JSON y no tabla aparte porque es solo
    -- para mostrar: no se filtra ni se agrupa por estos items.
    ADD COLUMN incluye JSON NULL AFTER imagen_url,
    -- La estetica puede tener una sola profesional: por eso es opcional.
    ADD COLUMN profesional VARCHAR(100) NULL AFTER incluye,
    ADD COLUMN badge ENUM('Nuevo', 'Más elegido', 'Promo') NULL AFTER profesional,
    ADD COLUMN sesiones_recomendadas TINYINT UNSIGNED NULL AFTER badge,
    ADD INDEX idx_servicios_categoria (categoria);

-- Nota para el equipo de base de datos:
--
-- `categoria` es un ENUM y no una FK a `categorias` a proposito: esa tabla es de
-- productos (productos.categoria_id), y mezclar "Masajes" con "Cremas" en la
-- misma tabla seria incorrecto. El costo es que agregar una categoria nueva pide
-- un ALTER TABLE, pero el frontend tambien tiene el tipo cerrado (ServiceCategory),
-- asi que de todos modos requiere un cambio de codigo.
