-- Servicios reales de dppuntobelleza: los que pasó Daniela por WhatsApp el 20/11/2026.
-- Requiere seed_01_servicios.sql. Los que ya existían se actualizan (así los turnos de
-- ejemplo no pierden su servicio), los nuevos se agregan y los que Daniela no hace se
-- ocultan (activo = 0, no se borran).
-- Las duraciones son estimadas: Daniela las ajusta desde el panel.
-- Se puede correr más de una vez.
-- Uso (desde la raíz del repo): mysql dp_belleza < database/seeds/seed_08_servicios_dppuntobelleza.sql

SET NAMES utf8mb4;

-- Limpieza facial Premium
UPDATE servicios
   SET nombre = 'Limpieza facial Premium',
       categoria = 'Facial',
       descripcion_corta = 'Renovación celular de alta calidad, adaptada a tu biotipo cutáneo.',
       descripcion = 'La limpieza se adapta a cada biotipo cutáneo: vamos a mejorar pieles envejecidas, con manchas y líneas de expresión. Renovación celular de alta calidad. Todo acorde al biotipo cutáneo.',
       imagen_url = '/fotos/servicios/limpieza-premium.jpg',
       incluye = '["Emulsión de limpieza", "Exfoliación", "Microdermoabrasión", "Peeling enzimático y químico", "Espátula ultrasónica", "Extracciones", "Hidratación", "Alta frecuencia", "Fototerapia"]',
       profesional = 'Daniela P.',
       badge = NULL,
       sesiones_recomendadas = NULL,
       duracion_min = 90,
       precio = 40000,
       activo = 1
 WHERE nombre IN ('Limpieza facial Premium', 'Limpieza Facial Profunda');
INSERT INTO servicios (nombre, categoria, descripcion_corta, descripcion, imagen_url, incluye, profesional, badge, sesiones_recomendadas, duracion_min, precio)
SELECT 'Limpieza facial Premium', 'Facial', 'Renovación celular de alta calidad, adaptada a tu biotipo cutáneo.', 'La limpieza se adapta a cada biotipo cutáneo: vamos a mejorar pieles envejecidas, con manchas y líneas de expresión. Renovación celular de alta calidad. Todo acorde al biotipo cutáneo.', '/fotos/servicios/limpieza-premium.jpg', '["Emulsión de limpieza", "Exfoliación", "Microdermoabrasión", "Peeling enzimático y químico", "Espátula ultrasónica", "Extracciones", "Hidratación", "Alta frecuencia", "Fototerapia"]', 'Daniela P.', NULL, NULL, 90, 40000
WHERE NOT EXISTS (SELECT 1 FROM servicios WHERE nombre IN ('Limpieza facial Premium', 'Limpieza Facial Profunda'));

-- Limpieza facial efecto Glow
INSERT INTO servicios (nombre, categoria, descripcion_corta, descripcion, imagen_url, incluye, profesional, badge, sesiones_recomendadas, duracion_min, precio)
SELECT 'Limpieza facial efecto Glow', 'Facial', 'Una piel luminosa y firme como nunca viste.', 'Una piel luminosa y firme como nunca viste.', '/fotos/servicios/limpieza-glow.jpg', '["Emulsión", "Exfoliación", "Máscara enzimática", "Espátula ultrasónica", "Hidratación", "Fototerapia"]', 'Daniela P.', NULL, NULL, 60, 35000
WHERE NOT EXISTS (SELECT 1 FROM servicios WHERE nombre IN ('Limpieza facial efecto Glow'));

-- Limpieza facial + hidratación
INSERT INTO servicios (nombre, categoria, descripcion_corta, descripcion, imagen_url, incluye, profesional, badge, sesiones_recomendadas, duracion_min, precio)
SELECT 'Limpieza facial + hidratación', 'Facial', 'Ideal para pieles deshidratadas que necesitan recuperar luminosidad.', 'Ideal para pieles deshidratadas, que necesiten recuperar luminosidad.', '/fotos/servicios/limpieza-hidratacion.jpg', '["Emulsión de limpieza", "Máscara enzimática", "Microdermoabrasión", "Máscara hidratante", "Sérum hidratante", "Crema hidratante"]', 'Daniela P.', NULL, NULL, 60, 25000
WHERE NOT EXISTS (SELECT 1 FROM servicios WHERE nombre IN ('Limpieza facial + hidratación'));

-- Mi primer facial (13 a 17 años)
INSERT INTO servicios (nombre, categoria, descripcion_corta, descripcion, imagen_url, incluye, profesional, badge, sesiones_recomendadas, duracion_min, precio)
SELECT 'Mi primer facial (13 a 17 años)', 'Facial', 'Vamos a limpiar tu rostro y enseñarte a cuidarlo día a día.', 'Pensado para chicas y chicos de 13 a 17 años. Vamos a limpiar tu rostro y enseñarte a cuidarlo día a día.', '/fotos/servicios/mi-primer-facial.jpg', '[]', 'Daniela P.', NULL, NULL, 45, 30000
WHERE NOT EXISTS (SELECT 1 FROM servicios WHERE nombre IN ('Mi primer facial (13 a 17 años)'));

-- Dermaplaning
UPDATE servicios
   SET nombre = 'Dermaplaning',
       categoria = 'Facial',
       descripcion_corta = 'Piel suave desde la primera sesión.',
       descripcion = 'Piel suave desde la primera sesión. Se retiran hasta 8 capas de piel y vello del rostro, logrando así una suavidad única.',
       imagen_url = '/fotos/servicios/dermaplaning.jpg',
       incluye = '[]',
       profesional = 'Daniela P.',
       badge = NULL,
       sesiones_recomendadas = NULL,
       duracion_min = 45,
       precio = 40000,
       activo = 1
 WHERE nombre IN ('Dermaplaning', 'Dermaplaning Facial');
INSERT INTO servicios (nombre, categoria, descripcion_corta, descripcion, imagen_url, incluye, profesional, badge, sesiones_recomendadas, duracion_min, precio)
SELECT 'Dermaplaning', 'Facial', 'Piel suave desde la primera sesión.', 'Piel suave desde la primera sesión. Se retiran hasta 8 capas de piel y vello del rostro, logrando así una suavidad única.', '/fotos/servicios/dermaplaning.jpg', '[]', 'Daniela P.', NULL, NULL, 45, 40000
WHERE NOT EXISTS (SELECT 1 FROM servicios WHERE nombre IN ('Dermaplaning', 'Dermaplaning Facial'));

-- Dermapen
INSERT INTO servicios (nombre, categoria, descripcion_corta, descripcion, imagen_url, incluye, profesional, badge, sesiones_recomendadas, duracion_min, precio)
SELECT 'Dermapen', 'Facial', 'Activación directa de colágeno y elastina.', 'Activación directa de colágeno y elastina generada por pequeñas lesiones controladas, con activos acordes al paciente.

$30.000 la sesión · $120.000 las 5 sesiones.', '/fotos/servicios/dermapen.jpg', '[]', 'Daniela P.', NULL, 5, 60, 30000
WHERE NOT EXISTS (SELECT 1 FROM servicios WHERE nombre IN ('Dermapen'));

-- Exosomas
INSERT INTO servicios (nombre, categoria, descripcion_corta, descripcion, imagen_url, incluye, profesional, badge, sesiones_recomendadas, duracion_min, precio)
SELECT 'Exosomas', 'Facial', 'Más luminosidad, hidratación y una piel más uniforme.', 'Ayudan a mejorar la calidad cutánea, aportando luminosidad, hidratación y una apariencia más uniforme y saludable.

$50.000 la sesión · $140.000 las 4 sesiones.', '/fotos/servicios/exosomas.jpg', '[]', 'Daniela P.', NULL, 4, 60, 50000
WHERE NOT EXISTS (SELECT 1 FROM servicios WHERE nombre IN ('Exosomas'));

-- PDRN
INSERT INTO servicios (nombre, categoria, descripcion_corta, descripcion, imagen_url, incluye, profesional, badge, sesiones_recomendadas, duracion_min, precio)
SELECT 'PDRN', 'Facial', 'Una piel con aspecto más luminoso, hidratado y revitalizado.', 'Una piel con aspecto más luminoso, hidratado y revitalizado. El tratamiento con PDRN busca mejorar la calidad cutánea, favorecer los procesos de reparación y contribuir a una piel de apariencia más firme, uniforme y saludable.

$50.000 la sesión · $140.000 las 4 sesiones.', '/fotos/servicios/pdrn.jpg', '[]', 'Daniela P.', NULL, 4, 60, 50000
WHERE NOT EXISTS (SELECT 1 FROM servicios WHERE nombre IN ('PDRN'));

-- Peeling corporal
INSERT INTO servicios (nombre, categoria, descripcion_corta, descripcion, imagen_url, incluye, profesional, badge, sesiones_recomendadas, duracion_min, precio)
SELECT 'Peeling corporal', 'Corporal', 'Renovación celular para una piel más limpia y sin imperfecciones.', 'Renovación celular en zona corporal, logrando una piel más limpia y sin imperfecciones.', '/fotos/servicios/peeling-corporal.jpg', '[]', 'Daniela P.', NULL, NULL, 60, 40000
WHERE NOT EXISTS (SELECT 1 FROM servicios WHERE nombre IN ('Peeling corporal'));

-- Drenaje linfático manual
UPDATE servicios
   SET nombre = 'Drenaje linfático manual',
       categoria = 'Corporal',
       descripcion_corta = 'Ayuda a eliminar líquidos retenidos y la sensación de pesadez.',
       descripcion = 'Un tratamiento suave y delicado que estimula el sistema linfático, favoreciendo la eliminación de líquidos retenidos y ayudando a reducir la sensación de pesadez e hinchazón.',
       imagen_url = '/fotos/servicios/drenaje-linfatico.jpg',
       incluye = '[]',
       profesional = 'Daniela P.',
       badge = NULL,
       sesiones_recomendadas = NULL,
       duracion_min = 60,
       precio = 40000,
       activo = 1
 WHERE nombre IN ('Drenaje linfático manual', 'Drenaje Linfático Manual');
INSERT INTO servicios (nombre, categoria, descripcion_corta, descripcion, imagen_url, incluye, profesional, badge, sesiones_recomendadas, duracion_min, precio)
SELECT 'Drenaje linfático manual', 'Corporal', 'Ayuda a eliminar líquidos retenidos y la sensación de pesadez.', 'Un tratamiento suave y delicado que estimula el sistema linfático, favoreciendo la eliminación de líquidos retenidos y ayudando a reducir la sensación de pesadez e hinchazón.', '/fotos/servicios/drenaje-linfatico.jpg', '[]', 'Daniela P.', NULL, NULL, 60, 40000
WHERE NOT EXISTS (SELECT 1 FROM servicios WHERE nombre IN ('Drenaje linfático manual', 'Drenaje Linfático Manual'));

-- Depilación definitiva unisex
UPDATE servicios
   SET nombre = 'Depilación definitiva unisex',
       categoria = 'Depilación',
       descripcion_corta = 'Soprano Alma Original: disminución del vello desde la primera sesión.',
       descripcion = 'Depilación definitiva con Soprano Alma Original. Disminución del vello desde la primera sesión.

Cuerpo completo (bozo, mentón, cavado, axilas, tira de cola y piernas): $48.000.
Zona adicional al cuerpo completo: $6.000.
Zona individual: $13.000.',
       imagen_url = '/fotos/servicios/depilacion-soprano.jpg',
       incluye = '[]',
       profesional = 'Daniela P.',
       badge = NULL,
       sesiones_recomendadas = NULL,
       duracion_min = 60,
       precio = 48000,
       activo = 1
 WHERE nombre IN ('Depilación definitiva unisex', 'Depilación Definitiva con Láser');
INSERT INTO servicios (nombre, categoria, descripcion_corta, descripcion, imagen_url, incluye, profesional, badge, sesiones_recomendadas, duracion_min, precio)
SELECT 'Depilación definitiva unisex', 'Depilación', 'Soprano Alma Original: disminución del vello desde la primera sesión.', 'Depilación definitiva con Soprano Alma Original. Disminución del vello desde la primera sesión.

Cuerpo completo (bozo, mentón, cavado, axilas, tira de cola y piernas): $48.000.
Zona adicional al cuerpo completo: $6.000.
Zona individual: $13.000.', '/fotos/servicios/depilacion-soprano.jpg', '[]', 'Daniela P.', NULL, NULL, 60, 48000
WHERE NOT EXISTS (SELECT 1 FROM servicios WHERE nombre IN ('Depilación definitiva unisex', 'Depilación Definitiva con Láser'));

-- Masaje descontracturante
UPDATE servicios
   SET nombre = 'Masaje descontracturante',
       categoria = 'Masajes',
       descripcion_corta = 'Aliviá tensiones, liberá contracturas y recuperá el bienestar.',
       descripcion = 'Aliviá las tensiones musculares, liberá contracturas y recuperá la sensación de bienestar. A través de maniobras y técnicas específicas, trabajamos sobre las zonas de mayor tensión para favorecer la relajación muscular y brindar alivio y descanso al cuerpo.',
       imagen_url = '/fotos/servicios/masaje-descontracturante.jpg',
       incluye = '[]',
       profesional = 'Daniela P.',
       badge = NULL,
       sesiones_recomendadas = NULL,
       duracion_min = 60,
       precio = 35000,
       activo = 1
 WHERE nombre IN ('Masaje descontracturante', 'Masaje Descontracturante');
INSERT INTO servicios (nombre, categoria, descripcion_corta, descripcion, imagen_url, incluye, profesional, badge, sesiones_recomendadas, duracion_min, precio)
SELECT 'Masaje descontracturante', 'Masajes', 'Aliviá tensiones, liberá contracturas y recuperá el bienestar.', 'Aliviá las tensiones musculares, liberá contracturas y recuperá la sensación de bienestar. A través de maniobras y técnicas específicas, trabajamos sobre las zonas de mayor tensión para favorecer la relajación muscular y brindar alivio y descanso al cuerpo.', '/fotos/servicios/masaje-descontracturante.jpg', '[]', 'Daniela P.', NULL, NULL, 60, 35000
WHERE NOT EXISTS (SELECT 1 FROM servicios WHERE nombre IN ('Masaje descontracturante', 'Masaje Descontracturante'));

-- Masaje relajante
UPDATE servicios
   SET nombre = 'Masaje relajante',
       categoria = 'Masajes',
       descripcion_corta = 'Un momento de calma para desconectar de la rutina.',
       descripcion = 'Desconectá de la rutina y regalale a tu cuerpo un momento de calma y bienestar. A través de movimientos suaves y envolventes, ayudamos a liberar tensiones, reducir el estrés y recuperar el equilibrio entre cuerpo y mente.',
       imagen_url = '/fotos/servicios/masaje-relajante.jpg',
       incluye = '[]',
       profesional = 'Daniela P.',
       badge = NULL,
       sesiones_recomendadas = NULL,
       duracion_min = 60,
       precio = 35000,
       activo = 1
 WHERE nombre IN ('Masaje relajante', 'Masaje Relajante con Aromaterapia');
INSERT INTO servicios (nombre, categoria, descripcion_corta, descripcion, imagen_url, incluye, profesional, badge, sesiones_recomendadas, duracion_min, precio)
SELECT 'Masaje relajante', 'Masajes', 'Un momento de calma para desconectar de la rutina.', 'Desconectá de la rutina y regalale a tu cuerpo un momento de calma y bienestar. A través de movimientos suaves y envolventes, ayudamos a liberar tensiones, reducir el estrés y recuperar el equilibrio entre cuerpo y mente.', '/fotos/servicios/masaje-relajante.jpg', '[]', 'Daniela P.', NULL, NULL, 60, 35000
WHERE NOT EXISTS (SELECT 1 FROM servicios WHERE nombre IN ('Masaje relajante', 'Masaje Relajante con Aromaterapia'));

-- Masaje deportivo
INSERT INTO servicios (nombre, categoria, descripcion_corta, descripcion, imagen_url, incluye, profesional, badge, sesiones_recomendadas, duracion_min, precio)
SELECT 'Masaje deportivo', 'Masajes', 'Para personas activas: alivia la tensión y favorece la recuperación.', 'Un masaje enfocado en aliviar la tensión muscular, trabajar sobre las zonas de mayor exigencia física y favorecer la recuperación después del esfuerzo. Ideal para personas activas y deportistas que buscan mejorar su bienestar muscular, liberar contracturas y recuperar la sensación de movilidad y descanso.', '/fotos/servicios/masaje-deportivo.jpg', '[]', 'Daniela P.', NULL, NULL, 60, 40000
WHERE NOT EXISTS (SELECT 1 FROM servicios WHERE nombre IN ('Masaje deportivo'));

-- Los que Daniela no hace dejan de mostrarse.
UPDATE servicios SET activo = 0 WHERE nombre IN ('Masaje con Piedras Calientes', 'Peeling Químico Renovador', 'Tratamiento Reductor Corporal', 'Manicuría con Esmaltado Semipermanente', 'Pedicuría Spa Completa', 'Depilación con Cera Tibia', 'Lifting de Pestañas', 'Perfilado y Laminado de Cejas');
