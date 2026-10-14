# database

Fuente de verdad del schema. **Las migraciones viven solo acá**, no duplicadas
en `backend/`: dos copias se desincronizan.

| | |
|---|---|
| `migrations/` | Scripts versionados. `V1_scriptInicial.sql` crea las 12 tablas |
| `seeds/` | Datos de ejemplo para desarrollo. **No se corren en producción.** `ecommerce-datos-ejemplo.sql` carga categorías y los productos que muestra hoy la tienda |

## Tablas

| Dominio | Tablas |
|---|---|
| Compartido | `usuarios`, `clientes`, `configuracion` |
| E-commerce | `categorias`, `productos`, `pedidos`, `pedido_items` |
| Turnera | `servicios`, `horarios_atencion`, `bloqueos`, `turnos`, `recordatorios` |

`clientes` es compartida a propósito: la misma persona reserva turnos y compra
productos, y se identifica por teléfono. Es lo que le permite a la dueña abrir
una clienta y ver su historial completo de los dos lados. Ver `backend/README.md`.
