-- V16: nombre y WhatsApp reales del local.
--
-- El nombre del local es "dppuntobelleza" (V1 lo dejaba como 'Dp.belleza').
-- El WhatsApp es el de Daniela, 223 522-9520, guardado como lo normaliza el
-- backend (549 + área + número), igual que si se cargara desde Ajustes.
-- Solo pisa los valores de fábrica: si la dueña ya cargó otros, quedan.

UPDATE configuracion SET valor = 'dppuntobelleza'
 WHERE clave = 'nombre_negocio' AND valor IN ('Dp.belleza', 'Dppuntobelleza', '');

UPDATE configuracion SET valor = '5492235229520'
 WHERE clave = 'telefono_negocio' AND valor = '';
