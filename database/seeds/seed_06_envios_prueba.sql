-- seed_06: envíos en modo prueba, para desarrollo y la demo.
--
-- SOLO PARA DESARROLLO Y DEMO. En producción la dueña elige el modo en
-- Ajustes → Envíos y, para Andreani, carga la cuenta del local.
--
-- Modo prueba: la tienda ofrece envío a domicilio con tarifas y seguimiento
-- simulados (no llama a Andreani). Despacha desde Mar del Plata y es gratis
-- desde $50.000 de productos.

UPDATE configuracion SET valor = 'prueba' WHERE clave = 'envio_modo';
UPDATE configuracion SET valor = '7600'   WHERE clave = 'envio_cp_origen';
UPDATE configuracion SET valor = '50000'  WHERE clave = 'envio_gratis_desde';
