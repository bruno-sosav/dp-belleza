-- Productos reales de dppuntobelleza: los que Daniela tiene en stock (WhatsApp, 26/10/2026).
-- Generado desde productos_dppuntobelleza.csv (ahí están las notas de lo que hay que confirmar con ella).
-- Stock 1 de cada uno: Daniela lo ajusta desde el panel. Las fotos están en frontend/cliente/public/fotos/productos.
-- Oculta (activo = 0, no borra) los productos de ejemplo de ecommerce-datos-ejemplo.sql, que no son de ella.
-- Se puede correr más de una vez: no duplica categorías ni productos.
-- Uso (desde la raíz del repo): mysql dp_belleza < database/seeds/seed_07_productos_dppuntobelleza.sql

SET NAMES utf8mb4;

INSERT IGNORE INTO categorias (nombre) VALUES
    ('Hidratación'),
    ('Antiedad'),
    ('Limpieza'),
    ('Protección solar'),
    ('Tónicos y brumas'),
    ('Sérums');

INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, imagen_url)
SELECT (SELECT id FROM categorias WHERE nombre = 'Hidratación'), 'Lidherma · Acnex Depure Control Treatment',
       'Crema hidratante para pieles grasas y seborreicas.', 36500, 1, '/fotos/productos/lidherma-acnex-depure-control-treatment.jpg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Lidherma · Acnex Depure Control Treatment');
INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, imagen_url)
SELECT (SELECT id FROM categorias WHERE nombre = 'Antiedad'), 'Lidherma · Hyaluronic 4D Rich Cream',
       'Crema emoliente con efecto relleno.', 48500, 1, '/fotos/productos/lidherma-hyaluronic-4d-rich-cream.jpg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Lidherma · Hyaluronic 4D Rich Cream');
INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, imagen_url)
SELECT (SELECT id FROM categorias WHERE nombre = 'Limpieza'), 'Lidherma · Matt Balance Cleansing Gel',
       'Gel de higiene profunda que minimiza el aspecto de los poros.', 34000, 1, '/fotos/productos/lidherma-matt-balance-cleansing-gel.jpg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Lidherma · Matt Balance Cleansing Gel');
INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, imagen_url)
SELECT (SELECT id FROM categorias WHERE nombre = 'Hidratación'), 'Lidherma · Matt Balance Cream',
       'Crema matificante suave y liviana que ayuda a minimizar el aspecto de los poros. Indicada para piel grasa o mixta.', 39000, 1, '/fotos/productos/lidherma-matt-balance-cream.jpg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Lidherma · Matt Balance Cream');
INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, imagen_url)
SELECT (SELECT id FROM categorias WHERE nombre = 'Limpieza'), 'Lidherma · Detoxify Deep Cleanser Gel',
       'Gel de limpieza detox que protege la barrera cutánea.', 29500, 1, '/fotos/productos/lidherma-detoxify-deep-cleanser-gel.jpg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Lidherma · Detoxify Deep Cleanser Gel');
INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, imagen_url)
SELECT (SELECT id FROM categorias WHERE nombre = 'Protección solar'), 'Lidherma · Protector Solar UVA Plus FPS 30',
       'Protector solar en spray, factor 30.', 35000, 1, '/fotos/productos/lidherma-protector-solar-uva-plus-fps-30.jpg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Lidherma · Protector Solar UVA Plus FPS 30');
INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, imagen_url)
SELECT (SELECT id FROM categorias WHERE nombre = 'Antiedad'), 'Lidherma · Retinol A+ Daily Cream',
       'Crema con retinol y ácido hialurónico. Otorga hidratación, unifica el tono y da brillo y luminosidad.', 47500, 1, '/fotos/productos/lidherma-retinol-a-daily-cream.jpg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Lidherma · Retinol A+ Daily Cream');
INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, imagen_url)
SELECT (SELECT id FROM categorias WHERE nombre = 'Limpieza'), 'Lidherma · Fórmula Jabón Líquido',
       'Gel de higiene para piel grasa y mixta.', 28000, 1, '/fotos/productos/lidherma-formula-jabon-liquido.jpg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Lidherma · Fórmula Jabón Líquido');
INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, imagen_url)
SELECT (SELECT id FROM categorias WHERE nombre = 'Limpieza'), 'Lidherma · Fórmula Limpieza',
       'Emulsión de limpieza para pieles sensibles y secas.', 24500, 1, '/fotos/productos/lidherma-formula-limpieza.jpg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Lidherma · Fórmula Limpieza');
INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, imagen_url)
SELECT (SELECT id FROM categorias WHERE nombre = 'Tónicos y brumas'), 'Lidherma · Fórmula Hierbas',
       'Bruma descongestiva.', 24000, 1, '/fotos/productos/lidherma-formula-hierbas.jpg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Lidherma · Fórmula Hierbas');
INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, imagen_url)
SELECT (SELECT id FROM categorias WHERE nombre = 'Tónicos y brumas'), 'Carthage · Deep Care 2 Loción Tónica Astringente',
       'Loción tónica astringente para piel grasa.', 16000, 1, '/fotos/productos/carthage-deep-care-2-locion-tonica-astringente.jpg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Carthage · Deep Care 2 Loción Tónica Astringente');
INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, imagen_url)
SELECT (SELECT id FROM categorias WHERE nombre = 'Hidratación'), 'Carthage · Deep Care 4 Emulsión Hidratante Oil Free',
       'Emulsión hidratante libre de aceite.', 22800, 1, '/fotos/productos/carthage-deep-care-4-emulsion-hidratante-oil-free.jpg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Carthage · Deep Care 4 Emulsión Hidratante Oil Free');
INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, imagen_url)
SELECT (SELECT id FROM categorias WHERE nombre = 'Tónicos y brumas'), 'Carthage · Deep Care 2 Bruma Descongestiva',
       'Bruma que alivia y refresca las pieles sensibles.', 15800, 1, '/fotos/productos/carthage-deep-care-2-bruma-descongestiva.jpg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Carthage · Deep Care 2 Bruma Descongestiva');
INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, imagen_url)
SELECT (SELECT id FROM categorias WHERE nombre = 'Sérums'), 'Carthage · Solución Concentrada Lifting Peptide',
       'Sérum facial concentrado con péptidos de efecto lifting.', 22000, 1, '/fotos/productos/carthage-solucion-concentrada-lifting-peptide.jpg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Carthage · Solución Concentrada Lifting Peptide');
INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, imagen_url)
SELECT (SELECT id FROM categorias WHERE nombre = 'Antiedad'), 'Carthage · Crema Hidratante Efecto Lifting',
       'Crema hidratante con efecto lifting.', 29500, 1, '/fotos/productos/carthage-crema-hidratante-efecto-lifting.jpg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Carthage · Crema Hidratante Efecto Lifting');
INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, imagen_url)
SELECT (SELECT id FROM categorias WHERE nombre = 'Hidratación'), 'Lidherma · Fórmula Nutrisomas',
       'Crema nutritiva.', 30500, 1, '/fotos/productos/lidherma-formula-nutrisomas.jpg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Lidherma · Fórmula Nutrisomas');
INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, imagen_url)
SELECT (SELECT id FROM categorias WHERE nombre = 'Tónicos y brumas'), 'Carthage · Total Relief Gel Descongestivo',
       'Gel descongestivo para pieles sensibles.', 17000, 1, '/fotos/productos/carthage-total-relief-gel-descongestivo.jpg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Carthage · Total Relief Gel Descongestivo');
INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, imagen_url)
SELECT (SELECT id FROM categorias WHERE nombre = 'Antiedad'), 'Mary Kay · TimeWise Nighttime Recovery',
       'Gel facial de recuperación nocturna.', 61900, 1, '/fotos/productos/mary-kay-timewise-nighttime-recovery.jpg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Mary Kay · TimeWise Nighttime Recovery');
INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, imagen_url)
SELECT (SELECT id FROM categorias WHERE nombre = 'Protección solar'), 'Mary Kay · TimeWise Daytime Defender FPS 30',
       'Loción facial protectora de día con FPS 30.', 51500, 1, '/fotos/productos/mary-kay-timewise-daytime-defender-fps-30.jpg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Mary Kay · TimeWise Daytime Defender FPS 30');
INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, imagen_url)
SELECT (SELECT id FROM categorias WHERE nombre = 'Hidratación'), 'Mary Kay · TimeWise Antioxidant Moisturizer',
       'Loción facial humectante con antioxidantes.', 55500, 1, '/fotos/productos/mary-kay-timewise-antioxidant-moisturizer.jpg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Mary Kay · TimeWise Antioxidant Moisturizer');
INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, imagen_url)
SELECT (SELECT id FROM categorias WHERE nombre = 'Limpieza'), 'Mary Kay · TimeWise 4-in-1 Cleanser',
       'Limpiador facial 4 en 1.', 43300, 1, '/fotos/productos/mary-kay-timewise-4-in-1-cleanser.jpg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Mary Kay · TimeWise 4-in-1 Cleanser');
INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, imagen_url)
SELECT (SELECT id FROM categorias WHERE nombre = 'Limpieza'), 'Carthage · Deep Care 1 Fluido Dermo-Limpiador',
       'Fluido limpiador para piel sensible y delicada.', 20300, 1, '/fotos/productos/carthage-deep-care-1-fluido-dermo-limpiador.jpg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Carthage · Deep Care 1 Fluido Dermo-Limpiador');
INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, imagen_url)
SELECT (SELECT id FROM categorias WHERE nombre = 'Antiedad'), 'Carthage · Dragon''s Blood Lipo-Lifting Face Cream',
       'Crema premium lipo lifting, tensora y antiedad.', 37200, 1, '/fotos/productos/carthage-dragon-s-blood-lipo-lifting-face-cream.jpg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Carthage · Dragon''s Blood Lipo-Lifting Face Cream');
INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, imagen_url)
SELECT (SELECT id FROM categorias WHERE nombre = 'Antiedad'), 'Carthage · Moisturizing Cream Lifting Effect',
       'Crema hidratante con efecto lifting.', 31500, 1, '/fotos/productos/carthage-moisturizing-cream-lifting-effect.jpg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Carthage · Moisturizing Cream Lifting Effect');
INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, imagen_url)
SELECT (SELECT id FROM categorias WHERE nombre = 'Antiedad'), 'Carthage · Antiage Regenerating Cream',
       'Crema regeneradora antiedad con oligoelementos y extractos vegetales.', 31600, 1, '/fotos/productos/carthage-antiage-regenerating-cream.jpg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Carthage · Antiage Regenerating Cream');
INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, imagen_url)
SELECT (SELECT id FROM categorias WHERE nombre = 'Sérums'), 'Carthage · Dragon''s Blood Lipo-Lifting Solución Concentrada',
       'Sérum lipo lifting concentrado de efecto reafirmante.', 21600, 1, '/fotos/productos/carthage-dragon-s-blood-lipo-lifting-solucion-concentrada.jpg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Carthage · Dragon''s Blood Lipo-Lifting Solución Concentrada');
INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, imagen_url)
SELECT (SELECT id FROM categorias WHERE nombre = 'Sérums'), 'Carthage · Solución Concentrada Multivitamina',
       'Sérum facial con biotina, pantenol, niacinamida y vitamina C.', 23000, 1, '/fotos/productos/carthage-solucion-concentrada-multivitamina.jpg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Carthage · Solución Concentrada Multivitamina');
INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, imagen_url)
SELECT (SELECT id FROM categorias WHERE nombre = 'Sérums'), 'Carthage · Solución Concentrada Collagen Plus',
       'Sérum facial con colágeno.', 21800, 1, '/fotos/productos/carthage-solucion-concentrada-collagen-plus.jpg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Carthage · Solución Concentrada Collagen Plus');
INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, imagen_url)
SELECT (SELECT id FROM categorias WHERE nombre = 'Hidratación'), 'Lidherma · Fórmula Hidrosomas',
       'Crema hidratante.', 38000, 1, '/fotos/productos/lidherma-formula-hidrosomas.jpg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Lidherma · Fórmula Hidrosomas');
INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, imagen_url)
SELECT (SELECT id FROM categorias WHERE nombre = 'Antiedad'), 'Lidherma · Fórmula Firmosomas',
       'Crema tensora.', 38000, 1, '/fotos/productos/lidherma-formula-firmosomas.jpg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Lidherma · Fórmula Firmosomas');

-- Los de ejemplo (fotos de picsum) dejan de mostrarse en la tienda.
UPDATE productos SET activo = 0 WHERE imagen_url LIKE 'https://picsum.photos/seed/%';
