# Backend — Ecommerce DP Belleza

API REST de la tienda online: catálogo, pedidos y panel de administración.
Node + Express 5 + TypeScript, sobre la base MySQL de `database/migrations/V1_scriptInicial.sql`.

## Puesta en marcha

Requisitos: Node 20+ y MySQL 8.

```bash
cd backend
npm install
cp .env.example .env            # completar datos de MySQL y JWT_SECRET

# Base de datos (una sola vez)
mysql -e "CREATE DATABASE dp_belleza"
mysql dp_belleza < ../database/migrations/V1_scriptInicial.sql
mysql dp_belleza < db/seed-ecommerce.sql        # productos de ejemplo (opcional)

# Usuario para el panel
npm run crear-admin -- "Nombre" email@ejemplo.com "clave-segura"

npm run dev                     # http://localhost:3000
```

| Script | Qué hace |
|---|---|
| `npm run dev` | Levanta la API y se reinicia sola al guardar |
| `npm run build` / `npm start` | Compila a `dist/` y corre la versión compilada |
| `npm run typecheck` | Chequea tipos |
| `npm test` | Tests unitarios |

## Endpoints

Todas las respuestas son JSON. Los errores tienen la forma `{ "error": "mensaje", "detalle"?: ... }`.

### Tienda (públicos)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/salud` | Chequeo de que la API está viva |
| GET | `/api/categorias` | Categorías activas |
| GET | `/api/productos?categoria=1&q=serum` | Productos activos (filtros opcionales) |
| GET | `/api/productos/:id` | Un producto activo |
| POST | `/api/pedidos` | Crea un pedido (checkout) |

**POST `/api/pedidos`**

```json
{
  "cliente": { "nombre": "Ana", "apellido": "Pérez", "telefono": "223 15-123-4567", "email": "ana@mail.com" },
  "items": [{ "productoId": 1, "cantidad": 2 }],
  "notas": "Retiro en el local"
}
```

- El cliente no tiene cuenta: se identifica por **teléfono**. Si ya compró antes, se reutiliza su registro.
  El teléfono se guarda normalizado (`5492231234567`).
- Los **precios salen de la base**, no del navegador. Se congelan en `pedido_items.precio_unitario`.
- Se **descuenta el stock** en la misma transacción. Si dos personas compran a la vez, no se vende más de lo que hay.
- Respuestas: `201` con el pedido creado, `400` si faltan datos, `409` si algún producto no está disponible o no tiene stock
  (en `detalle` viene cuál y por qué).

### Panel de administración

Primero `POST /api/auth/login` con `{ "email", "password" }` → devuelve `{ token, usuario }`.
El resto de las rutas piden el header `Authorization: Bearer <token>` (dura 8 horas).

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/auth/yo` | Usuario de la sesión actual |
| GET | `/api/admin/categorias` | Todas las categorías (incluye inactivas) |
| POST | `/api/admin/categorias` | Crea una categoría `{ nombre }` |
| PATCH | `/api/admin/categorias/:id` | Modifica `{ nombre?, activo? }` |
| GET | `/api/admin/productos` | Todos los productos (incluye dados de baja) |
| GET | `/api/admin/productos/:id` | Un producto |
| POST | `/api/admin/productos` | Crea `{ nombre, precio, stock, descripcion?, imagenUrl?, categoriaId?, activo? }` |
| PATCH | `/api/admin/productos/:id` | Modifica cualquiera de esos campos. Para dar de baja: `{ "activo": false }` |
| GET | `/api/admin/pedidos?estado=pendiente&desde=2026-10-01&hasta=2026-10-31` | Lista de pedidos (filtros opcionales) |
| GET | `/api/admin/pedidos/:id` | Pedido con cliente e items |
| PATCH | `/api/admin/pedidos/:id/estado` | Cambia el estado `{ "estado": "confirmado" }` |

- Los productos **no se borran**: se dan de baja con `activo: false`, porque los pedidos viejos los siguen referenciando.
- Estados de pedido: `pendiente → confirmado → entregado`, y `pendiente`/`confirmado → cancelado`.
  Al **cancelar**, el stock vuelve a los productos.

## Pendiente / a charlar con el equipo

- **Envío**: el checkout del frontend calcula envío (gratis desde $30.000, si no $2.500), pero la tabla `pedidos`
  no tiene columnas de envío ni de dirección. Hoy `total` es solo la suma de los productos.
- **Datos extra del frontend**: `oldPrice`, `badge`, `rating`, `reviews` y `sizes` no existen en la tabla `productos`.
- **Pagos**: no hay integración con un medio de pago (por ejemplo Mercado Pago); el pedido queda `pendiente`.
- **Fotos**: se cargan como link (`imagenUrl`), no hay subida de archivos.
