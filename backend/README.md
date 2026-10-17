# backend

API de Dp.belleza. **Node + Express 5 + TypeScript + MySQL** (la propuesta del equipo).

Están hechos los dos módulos: **ecommerce** (tienda + su parte del panel) y
**turnera** (servicios, disponibilidad y reserva de turnos), más lo compartido
(conexión, login, models).

## Regla principal: UNA sola app, módulos adentro

`src/turnera/` y `src/ecommerce/` **no son dos servidores**. Son dos grupos de
rutas que se montan en la misma aplicación (`src/app.ts`), con una sola conexión
a la base y un solo login:

```
/api/auth/*       ->  src/shared/auth/   login del panel
/api/tienda/*     ->  src/ecommerce/     (sub-equipo B)
/api/turnos/*     ->  src/turnera/       (sub-equipo A)
/api/admin/*      ->  src/admin/
```

Un solo proceso, un solo deploy. Los dos sub-equipos trabajan en carpetas que no
se tocan, sin pagar el costo de dos servicios.

## Los models van en `shared/`, no en cada módulo

Mirá el schema en `database/migrations/`: `clientes` lo usan **las dos** partes.

```
turnos.cliente_id   -> FK clientes(id)     (turnera)
pedidos.cliente_id  -> FK clientes(id)     (ecommerce)
```

Un cliente es la misma persona en los dos lados: se identifica por teléfono
(`uq_clientes_telefono`). Si alguien reservó un turno y después compra un
producto, el checkout tiene que **encontrar** ese cliente, no crear otro.

Por eso la operación "dado un teléfono, dame el cliente o creálo" está escrita
**una vez**, en `shared/models/clientes.ts` (`buscarOCrearCliente`), y la llaman
los dos módulos. El teléfono se normaliza siempre igual en `shared/models/telefono.ts`
(`0223 15-123-4567` → `5492231234567`). Si cada equipo lo hiciera por su lado, la
base terminaría con la misma persona duplicada: los turnos en un registro y las
compras en el otro.

Regla: **una tabla = un model = un dueño.** Lo mismo para `usuarios` y `configuracion`.

## Estructura

```
backend/
├── src/
│   ├── index.ts              arranca el servidor
│   ├── app.ts                monta los módulos, CORS y manejo de errores
│   │
│   ├── shared/               lo que usan todos los módulos
│   │   ├── config.ts         variables de entorno (.env.local)
│   │   ├── db.ts             conexión a MySQL (una sola) y transacciones
│   │   ├── errors.ts         errores -> respuestas HTTP (400, 401, 404, 409…)
│   │   ├── configuracion.ts  lee la tabla `configuracion`
│   │   ├── auth/
│   │   │   ├── routes.ts     POST /api/auth/login, GET /api/auth/yo
│   │   │   └── middleware.ts requiereLogin (JWT)
│   │   └── models/
│   │       ├── clientes.ts   buscarOCrearCliente (tienda y turnera)
│   │       ├── telefono.ts   normalización de teléfonos
│   │       ├── productos.ts  consulta y formato de productos
│   │       └── pedidos.ts    estados del pedido y transiciones permitidas
│   │
│   ├── ecommerce/            /api/tienda
│   │   ├── routes.ts         catálogo y checkout
│   │   ├── service.ts        crearPedido (precios, stock, transacción)
│   │   └── validacion.ts     qué datos se aceptan (zod)
│   │
│   ├── turnera/              /api/turnos — pendiente (sub-equipo A)
│   │
│   └── admin/                /api/admin — todo pide login
│       ├── index.ts          exige login y junta los routers del panel
│       ├── tienda.ts         categorías, productos y pedidos
│       ├── stats.ts          estadísticas (SQL)
│       └── turnos.ts         agenda y cambio de estado de turnos
│
├── test/                     tests unitarios (npm test)
├── scripts/crear-admin.ts    crea un usuario del panel
├── .env.example
└── package.json
```

El SQL **no** está acá: las tablas se crean con `database/migrations/` y los
datos de ejemplo están en `database/seeds/`.

## Puesta en marcha

Requisitos: Node 20+ y MySQL 8.

```bash
# Desde la raíz del repo: un solo npm install para todo el monorepo
npm install
cp backend/.env.example backend/.env.local    # completar JWT_SECRET

# Base de datos. El primer comando es el UNICO que pide la clave de root:
# crea la base, el usuario de la API (dp_app) y el de migraciones (dp_dev).
mysql -u root -p < database/setup.sql

mysql -u dp_dev -p dp_belleza < database/migrations/V1_scriptInicial.sql
mysql -u dp_dev -p dp_belleza < database/migrations/V2_servicios_campos_del_front.sql
mysql -u dp_dev -p dp_belleza < database/migrations/V3_servicios_categoria_libre.sql
mysql -u dp_dev -p dp_belleza < database/migrations/V4_configuracion_contacto.sql
mysql -u dp_dev -p dp_belleza < database/migrations/V5_tipos_recordatorio.sql
mysql -u dp_dev -p dp_belleza < database/seeds/seed_01_servicios.sql
mysql -u dp_dev -p dp_belleza < database/seeds/seed_02_horarios.sql
mysql -u dp_dev -p dp_belleza < database/seeds/ecommerce-datos-ejemplo.sql
mysql -u dp_dev -p dp_belleza < database/seeds/seed_03_turnos_demo.sql       # historial (para las estadísticas)
mysql -u dp_dev -p dp_belleza < database/seeds/seed_04_turnos_proximos.sql   # agenda de hoy en adelante

# Usuario para el panel
npm run crear-admin -w @dp/backend -- "Nombre" email@ejemplo.com "clave-segura"

npm run dev:api                 # http://localhost:3000
```

Las variables locales van en **`.env.local`**, no en `.env`: el frontend usa Vite,
que solo lee `.env.local`, así que el backend sigue la misma regla y hay una sola
convención en todo el repo.

| Script | Qué hace |
|---|---|
| `npm run dev` | Levanta la API y se reinicia sola al guardar |
| `npm run build` / `npm start` | Compila a `dist/` y corre la versión compilada |
| `npm run typecheck` | Chequea tipos |
| `npm test` | Tests unitarios |

## Endpoints

Todas las respuestas son JSON. Los errores tienen la forma `{ "error": "mensaje", "detalle"?: ... }`.

### Tienda (públicos) — `/api/tienda`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/salud` | Chequeo de que la API está viva |
| GET | `/api/tienda/categorias` | Categorías activas |
| GET | `/api/tienda/productos?categoria=1&q=serum` | Productos activos (filtros opcionales) |
| GET | `/api/tienda/productos/:id` | Un producto activo |
| POST | `/api/tienda/pedidos` | Crea un pedido (checkout) |

**POST `/api/tienda/pedidos`**

```json
{
  "cliente": { "nombre": "Ana", "apellido": "Pérez", "telefono": "223 15-123-4567", "email": "ana@mail.com" },
  "items": [{ "productoId": 1, "cantidad": 2 }],
  "notas": "Retiro en el local"
}
```

- El cliente no tiene cuenta: se busca o se crea por **teléfono** (`buscarOCrearCliente`).
- Los **precios salen de la base**, no del navegador. Se congelan en `pedido_items.precio_unitario`.
- Se **descuenta el stock** en la misma transacción. Si dos personas compran a la vez, no se vende más de lo que hay.
- Respuestas: `201` con el pedido creado, `400` si faltan datos, `409` si algún producto no está disponible o no tiene stock
  (en `detalle` viene cuál y por qué).

### Turnera (públicos) — `/api/turnos`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/turnos/servicios` | Servicios activos |
| GET | `/api/turnos/servicios/:id` | Un servicio activo |
| GET | `/api/turnos/horarios` | Agenda semanal. **Los días que no aparecen están cerrados** |
| GET | `/api/turnos/disponibilidad?servicioId=1&fecha=2026-10-19` | Horarios libres de ese servicio ese día |
| POST | `/api/turnos` | Reserva un turno |

**POST `/api/turnos`**

```json
{
  "servicioId": 1,
  "fecha": "2026-10-19",
  "hora": "10:00",
  "contacto": { "nombreCompleto": "Ana María Pérez", "telefono": "0223 15 456-7890", "email": "ana@mail.com", "notas": "Primera vez" }
}
```

- Igual que la tienda: el cliente no tiene cuenta y se identifica por **teléfono**,
  con el mismo `buscarOCrearCliente`. Si Ana reservó un turno y después compra un
  producto, es **una sola fila** en `clientes`.
- La disponibilidad **se revalida dentro de la transacción** con `FOR UPDATE`. No se
  confía en la que consultó el navegador: entre consultar y confirmar pasa tiempo, y
  sin eso dos clientas que reservan a la vez pasan las dos la validación.
- Un slot está libre si entra completo en el horario de atención, no se solapa con
  ningún turno (estados `reservado`, `confirmado`, `completado`) ni con un `bloqueo`,
  y todavía no pasó. El paso entre horarios sale de `configuracion.intervalo_turnos_min`.
- Deja el recordatorio programado en `recordatorios`, según
  `configuracion.recordatorio_horas_antes`. Mandarlos es otro proceso, todavía no existe.
- Respuestas: `201` con el turno, `400` datos inválidos o fecha pasada,
  `404` servicio inexistente, `409` horario ocupado / día cerrado / no entra antes del cierre.

**Días de la semana:** `horarios_atencion.dia_semana` usa **ISO 8601** (1 = lunes …
7 = domingo), porque el CHECK de V1 es `BETWEEN 1 AND 7` y descarta el 0. **No** es la
convención de JavaScript, donde `getDay()` devuelve 0 para domingo. La conversión está
en un solo lugar: `diaSemanaISO()` en `src/turnera/tiempo.ts`.

**Fechas y horas:** el pool usa `dateStrings: true` y las cuentas se hacen en minutos
desde medianoche. Con `dateStrings: false` + `timezone: "Z"`, mysql2 lee un DATETIME
como UTC y lo pasa a hora local: un turno guardado a las 10:00 se lee 07:00 en
Argentina. Medido. No cambiar sin entender esto.

### Login — `/api/auth`

`POST /api/auth/login` con `{ "email", "password" }` → devuelve `{ token, usuario }`.
Se valida contra `usuarios.password_hash` (bcrypt). El resto de las rutas del panel piden
el header `Authorization: Bearer <token>` (dura 8 horas). `GET /api/auth/yo` devuelve el usuario de la sesión.

### Panel — `/api/admin`

| Método | Ruta | Descripción |
|---|---|---|
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
| GET | `/api/admin/turnos?desde=2026-10-15&hasta=2026-10-21&estado=reservado` | Turnos con cliente y servicio, por horario. Sin parámetros: los de hoy. Rango máximo 62 días |
| GET | `/api/admin/turnos/:id` | Un turno |
| PATCH | `/api/admin/turnos/:id/estado` | Cambia el estado `{ "estado": "completado" }` |

- Los productos **no se borran**: se dan de baja con `activo: false`, porque los pedidos viejos los siguen referenciando.
- Estados de turno (`src/turnera/estados.ts`): `reservado → confirmado → completado`, más
  `ausente` y `cancelado`. Se puede completar sin confirmar antes. `completado` y `ausente`
  se pueden deshacer (vuelven a `confirmado`); `cancelado` es final porque libera el horario.
  `completado`/`ausente` solo una vez que el turno empezó. Al cancelar, el recordatorio
  pendiente pasa a `cancelado`. **Las estadísticas solo cuentan los `completado`**: si la
  dueña no los marca, la plata no aparece.
- Estados de pedido: `pendiente → confirmado → entregado`, y `pendiente`/`confirmado → cancelado`.
  Al **cancelar**, el stock vuelve a los productos.

## Pendiente de decidir

| Tema | Estado |
|---|---|
| **Stack** | El ecommerce arrancó en Node + Express + TypeScript (la propuesta del equipo). Confirmarlo para que la turnera use lo mismo |
| CORS | Configurado para los dos orígenes con `CORS_ORIGINS` (en desarrollo `:5173` web y `:5174` panel). En producción: `https://dpbelleza.com.ar,https://admin.dpbelleza.com.ar` |
| Sesión | Hoy es un token JWT en el header `Authorization`, no una cookie, así que no depende del dominio |
| Envío | El checkout del frontend calcula envío (gratis desde $30.000, si no $2.500), pero `pedidos` no tiene columnas de envío ni de dirección. Hoy `total` es solo la suma de los productos |
| Datos extra del frontend | `oldPrice`, `badge`, `rating`, `reviews` y `sizes` no existen en la tabla `productos` |
| Pagos | No hay integración (por ejemplo Mercado Pago); el pedido queda `pendiente` |
| Fotos | Se cargan como link (`imagenUrl`), no hay subida de archivos |
