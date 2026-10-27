# backend

API de Dp.belleza. **Node + Express 5 + TypeScript + MySQL** (la propuesta del equipo).

El porqué de la arquitectura está en el [README del proyecto](../README.md#arquitectura-del-backend);
acá va el detalle.

## Arquitectura

`src/core/` tiene lo transversal (config, base de datos, errores, sesión) y
`src/modules/<dominio>/` cada parte del negocio, con estas carpetas:

```
modules/<dominio>/
├── controllers/     reciben el pedido, llaman al service y responden con un DTO; y las rutas
├── schemas/         lo que ENTRA (zod) y lo que SALE (DTO: solo los campos que usa cada pantalla)
├── services/        casos de uso: las reglas de cada operación
├── repositories/    leen y escriben MySQL
├── models/          entidades, reglas puras e interfaces (ports). Sin SQL ni Express
├── integrations/    Mercado Pago y las conexiones con otros módulos
└── <dominio>.module.ts  arma todo (inyección) y exporta lo único que ven los demás
```

Cada módulo tiene solo las carpetas que usa. Las capas de clean architecture
siguen estando, con estos nombres: `models` es el dominio, `services` la
aplicación, `repositories` + `integrations` la infraestructura y
`controllers` + `schemas` la presentación (MVC). Un service nunca importa un
repository: usa la interfaz de `models/*.ports.ts`, y el `.module.ts` le pasa
la implementación.

Un controller no tiene SQL ni reglas de negocio, y nunca devuelve una fila ni
una entidad entera: todo lo que sale pasa por un DTO.

**Nombres de archivo:** `nombre.rol.ts`, así cada archivo dice qué es sin
abrirlo (por ejemplo `caja.controller.ts`, `cobro.model.ts`):

| carpeta | rol | qué es |
|---|---|---|
| models | `.model.ts` | una entidad y sus reglas puras |
| models | `.ports.ts` | las interfaces que repositories e integrations implementan |
| services | `.usecases.ts` | los casos de uso (clases con `ejecutar`) |
| repositories | `.repository.ts` | lee y escribe las tablas del módulo |
| repositories | `.queries.ts` | vistas de lectura (pueden juntar tablas de otros módulos, nunca las escriben) |
| integrations | `.adapter.ts` | cumple un puerto usando otro módulo |
| integrations | `.gateway.ts` | un servicio externo (Mercado Pago) |
| controllers | `.controller.ts` `.routes.ts` | la capa HTTP |
| schemas | `.schema.ts` `.dto.ts` | lo que entra y lo que sale |
| raíz del módulo | `.module.ts` | arma todo y exporta la fachada |
| core | `.middleware.ts` `.util.ts` `.config.ts` `.port.ts` `.database.ts` `.error.ts` | lo transversal |

| módulo | controllers |
|---|---|
| `admin` (ajustes del negocio y estadísticas) | `ajustes.controller.ts`, `estadisticas.controller.ts` |
| `auth` (login y Tu cuenta) | `sesion.controller.ts`, `cuenta.controller.ts` |
| `appointments` (turnos y agenda) | `agenda.controller.ts`, `turnos.controller.ts` |
| `catalog` (servicios, productos, categorías) | `catalogo.controller.ts` |
| `customers` (clientas) | `clientes.controller.ts` |
| `inventory` (stock) | `inventario.controller.ts` |
| `orders` (pedidos de la tienda) | `checkout.controller.ts`, `pedidos.controller.ts` |
| `payments` (caja y Mercado Pago) | `pagos.controller.ts` |
| `reminders` (recordatorios) | `recordatorios.controller.ts` |

`orders` no tiene tablas ajenas: la clienta la busca o crea `customers`, los
precios los da `catalog` y el stock lo descuenta y devuelve `inventory`, todo a
través de sus fachadas (`integrations/pedidos.adapter.ts`) y dentro de la misma
transacción del pedido.

### Cómo se hablan los módulos

- Un módulo solo usa de otro lo que exporta su `.module.ts` (la fachada). Nunca
  importa sus repositories ni sus services.
- **Una tabla = un módulo dueño.** Solo ese módulo la escribe. Las vistas de
  lectura (`.queries.ts`) pueden hacer JOIN con tablas ajenas para mostrar
  datos, pero nunca escribirlas.
- Una clienta es la misma persona en la turnera y en la tienda: se identifica
  por teléfono y la busca o la crea `customers`, para que no quede duplicada.
- Cuando dos módulos se necesitarían mutuamente (turnos ↔ pagos), uno se
  *conecta* al otro al arrancar (`pagos.conectarTurnos`, `turnos.alReprogramar`)
  en vez de importarlo, así no hay imports circulares.
- El panel entero (`/api/admin`) está detrás de `requiereLogin`, en `app.ts`.

```
backend/
├── src/
│   ├── index.ts        arranca el servidor
│   ├── app.ts          monta las rutas de todos los módulos (web y panel)
│   ├── core/           config, base de datos, errores, middlewares, cifrado
│   └── modules/        un módulo por dominio (ver arriba)
├── test/               unitarios (npm test) e integracion/ (npm run test:integracion)
├── scripts/crear-admin.ts    crea o actualiza un usuario del panel
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
mysql -u dp_dev -p dp_belleza < database/migrations/V6_recordatorios_posteriores_cumple_mercadopago.sql
mysql -u dp_dev -p dp_belleza < database/migrations/V7_cancelacion_desde_la_web.sql
mysql -u dp_dev -p dp_belleza < database/migrations/V8_codigo_area_y_cuenta.sql
mysql -u dp_dev -p dp_belleza < database/migrations/V9_sena_mercadopago.sql
mysql -u dp_dev -p dp_belleza < database/migrations/V10_reglas_de_reserva.sql
mysql -u dp_dev -p dp_belleza < database/migrations/V11_caja.sql
mysql -u dp_dev -p dp_belleza < database/seeds/seed_01_servicios.sql
mysql -u dp_dev -p dp_belleza < database/seeds/seed_02_horarios.sql
mysql -u dp_dev -p dp_belleza < database/seeds/ecommerce-datos-ejemplo.sql
mysql -u dp_dev -p dp_belleza < database/seeds/seed_03_turnos_demo.sql       # historial (para las estadísticas)
mysql -u dp_dev -p dp_belleza < database/seeds/seed_04_turnos_proximos.sql   # agenda de hoy en adelante
mysql -u dp_dev -p dp_belleza < database/seeds/seed_05_pedidos_demo.sql       # historial de la tienda (para las estadísticas)

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
| `npm run typecheck` | Chequea tipos (src, scripts y tests) |
| `npm test` | Tests unitarios (sin base de datos) |
| `npm run test:integracion` | Tests contra la base de desarrollo, por HTTP |

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

- El cliente no tiene cuenta: se busca o se crea por **teléfono** (módulo `customers`).
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
  con el mismo módulo `customers`. Si Ana reservó un turno y después compra un
  producto, es **una sola fila** en `clientes`.
- La disponibilidad **se revalida dentro de la transacción** con `FOR UPDATE`. No se
  confía en la que consultó el navegador: entre consultar y confirmar pasa tiempo, y
  sin eso dos clientas que reservan a la vez pasan las dos la validación.
- Un slot está libre si entra completo en el horario de atención, no se solapa con
  ningún turno (estados `reservado`, `confirmado`, `completado`) ni con un `bloqueo`,
  y todavía no pasó. El paso entre horarios sale de `configuracion.intervalo_turnos_min`.
- Respuestas: `201` con el turno, `400` datos inválidos o fecha pasada,
  `404` servicio inexistente, `409` horario ocupado / día cerrado / no entra antes del cierre.

**Días de la semana:** `horarios_atencion.dia_semana` usa **ISO 8601** (1 = lunes …
7 = domingo), porque el CHECK de V1 es `BETWEEN 1 AND 7` y descarta el 0. **No** es la
convención de JavaScript, donde `getDay()` devuelve 0 para domingo. La conversión está
en un solo lugar: `diaSemanaISO()` en `src/core/tiempo.util.ts`.

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
| GET | `/api/admin/stats/dias?dias=180` | Serie diaria: plata de turnos completados y de la tienda (pedidos confirmados o entregados) |
| GET | `/api/admin/stats/productos?dias=30` | Productos más vendidos del período: `{ id, name, count, revenue, inactive }` |
| GET | `/api/admin/turnos?desde=2026-10-15&hasta=2026-10-21&estado=reservado` | Turnos con cliente y servicio, por horario. Sin parámetros: los de hoy. Rango máximo 62 días |
| GET | `/api/admin/turnos/:id` | Un turno |
| PATCH | `/api/admin/turnos/:id/estado` | Cambia el estado `{ "estado": "completado" }` |

- Los productos **no se borran**: se dan de baja con `activo: false`, porque los pedidos viejos los siguen referenciando.
- Estados de turno (`src/modules/appointments/models/estados.model.ts`): `reservado → confirmado → completado`, más
  `ausente` y `cancelado`. Se puede completar sin confirmar antes. `completado` y `ausente`
  se pueden deshacer (vuelven a `confirmado`); `cancelado` es final porque libera el horario.
  `completado`/`ausente` solo una vez que el turno empezó. Al cancelar, el recordatorio
  pendiente pasa a `cancelado`. **Las estadísticas solo cuentan los `completado`**: si la
  dueña no los marca, la plata no aparece.
- Estados de pedido: `pendiente → confirmado → entregado`, y `pendiente`/`confirmado → cancelado`.
  Al **cancelar**, el stock vuelve a los productos.

## Mercado Pago

La dueña conecta la cuenta del local en el panel (**Ajustes → Mercado Pago**):
pega la Public Key y el Access Token, el backend los prueba contra Mercado Pago
y los guarda en `mercadopago_cuenta`, con el token **cifrado**
(`src/core/seguridad/cifrado.util.ts`, clave en `CREDENCIALES_KEY` o derivada de
`JWT_SECRET`). Nunca vuelven enteros al navegador.

Todo lo de pagos vive en el módulo `src/modules/payments`. Para cobrar desde
otro módulo, usar su fachada:

```ts
import { pagos } from "../payments/payments.module.js"

const link = await pagos.crearLinkDePago({
  items: [{ titulo: "Crema hidratante", cantidad: 1, precioUnitario: 12000 }],
  referencia: `pedido-${pedidoId}`,                 // con esto se sabe qué se pagó
  vuelta: { exito: "…/pago/ok", pendiente: "…/pago/pendiente", error: "…/pago/error" },
  notificacion: "https://<api pública>/api/mercadopago/webhook",
})
// redirigir a la clienta a `link` (en modo prueba ya es el link de sandbox)
```

Cuando cambia un pago, Mercado Pago llama a `POST /api/mercadopago/webhook`: se
consulta el pago con el token del local (no se confía en el cuerpo), se verifica
la firma si hay clave secreta cargada, y queda en `mercadopago_pagos` con su
`referencia_externa`. La web puede preguntar
`GET /api/mercadopago/estado-pago?referencia=pedido-15` al volver del pago.

**En local el webhook no llega** (Mercado Pago no ve `localhost`). Para probarlo
hace falta exponer la API, por ejemplo con `ngrok http 3000`, y usar esa URL.

Falta (tienda): crear el link al confirmar un pedido y pasar el pedido a
`confirmado` cuando el pago llega `approved`. El aviso ya reparte por la
referencia (`destinoDelPago`): `turno-<id>` va a la seña del turno; para
`pedido-<id>` hay que conectar los pedidos igual que se conectan los turnos
(`pagos.conectarTurnos`, en `appointments.module.ts`).

## Pendiente de decidir

| Tema | Estado |
|---|---|
| CORS | Configurado para los dos orígenes con `CORS_ORIGINS` (en desarrollo `:5173` web y `:5174` panel). En producción: `https://dpbelleza.com.ar,https://admin.dpbelleza.com.ar` |
| Sesión | Hoy es un token JWT en el header `Authorization`, no una cookie, así que no depende del dominio |
| Envío | `pedidos` no tiene columnas de entrega: el checkout manda la forma de entrega y la dirección en `notas`, y el costo del envío se coordina por WhatsApp. `total` es solo la suma de los productos |
| Datos extra del frontend | `oldPrice`, `badge`, `rating`, `reviews` y `sizes` no existen en la tabla `productos` |
| Pagos de la tienda | Mercado Pago ya está para las señas de turnos; en la tienda el pedido todavía queda `pendiente` (ver arriba) |
| Fotos | Se cargan como link (`imagenUrl`), no hay subida de archivos |
