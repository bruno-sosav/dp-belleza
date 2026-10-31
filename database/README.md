# database

Fuente de verdad del schema. **Las migraciones viven solo acá**, no duplicadas
en `backend/`: dos copias se desincronizan.

| | |
|---|---|
| `migrations/` | Scripts versionados. `V1_scriptInicial.sql` crea las 12 tablas; V2 y V3 ajustan `servicios` (V3: categoría como texto libre); V4 suma los datos de contacto a `configuracion`; V5 crea `tipos_recordatorio`; V6 suma recordatorios de después y de cumpleaños, el cumpleaños de las clientas y Mercado Pago; V7, cancelar el turno desde la web; V8, el código de área del local; V9, la seña de los turnos con Mercado Pago; V10, reglas de anticipación para reservar; V11, la caja (`cobros`); V12, el pago de los pedidos de la tienda con Mercado Pago (y su lugar en la caja) |
| `seeds/` | Datos de ejemplo para desarrollo. **No se corren en producción.** `ecommerce-datos-ejemplo.sql` carga categorías y los productos que muestra hoy la tienda; `seed_05_pedidos_demo.sql`, ~120 días de pedidos para las estadísticas de la tienda |

## Tablas

| Dominio | Tablas |
|---|---|
| Compartido | `usuarios`, `clientes`, `configuracion` |
| E-commerce | `categorias`, `productos`, `pedidos`, `pedido_items` |
| Turnera | `servicios`, `horarios_atencion`, `bloqueos`, `turnos`, `recordatorios` |

`clientes` es compartida a propósito: la misma persona reserva turnos y compra
productos, y se identifica por teléfono. Es lo que le permite a la dueña abrir
una clienta y ver su historial completo de los dos lados. Ver `backend/README.md`.
