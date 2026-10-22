# dp-belleza

Sistema para la estética **Dp.belleza**: una web pública (turnos y tienda online)
y un panel para que la dueña maneje el local (agenda, clientas, caja, recordatorios).

Es un monorepo con tres partes:

```
dp-belleza/
├── database/      MySQL: migraciones (V1, V2…) y datos de ejemplo
├── backend/       API: Node + Express + TypeScript
└── frontend/
    ├── cliente/   web pública (React)
    ├── admin/     panel de la dueña (React)
    └── shared/    estilos y tipos que usan las dos apps
```

## Cómo correrlo

Requisitos: Node 20+ y MySQL 8. La base y el usuario del panel se preparan una
sola vez: los pasos están en [`backend/README.md`](backend/README.md#puesta-en-marcha).

```bash
npm install          # instala todo (npm workspaces)

npm run dev:api      # API          -> http://localhost:3000
npm run dev          # web pública  -> http://localhost:5173
npm run dev:admin    # panel        -> http://localhost:5174

npm test             # tests del backend
npm run build        # typecheck + build de las dos apps
```

## Arquitectura del backend

El backend está dividido **por dominio**: cada parte del negocio es un módulo
con sus propias carpetas.

```
backend/src/
├── core/                 lo que usan todos: config, base de datos, errores, sesión
├── modules/
│   ├── appointments/     turnos y agenda
│   ├── customers/        clientas
│   ├── catalog/          servicios, productos y categorías
│   ├── inventory/        stock
│   ├── payments/         caja y Mercado Pago
│   ├── reminders/        recordatorios por WhatsApp
│   ├── admin/            ajustes del negocio y estadísticas
│   ├── auth/             login del panel y "Tu cuenta"
│   └── orders/           pedidos de la tienda
└── app.ts                monta las rutas de todos los módulos
```

Y adentro de cada módulo, las mismas carpetas (solo las que usa):

```
modules/payments/
├── controllers/     reciben el pedido HTTP y responden
├── schemas/         qué datos entran (validación) y qué datos salen (DTO)
├── services/        las reglas de cada operación ("cobrar", "anotar un cobro")
├── repositories/    leen y escriben MySQL
├── models/          las entidades, sus reglas y las interfaces
├── integrations/    servicios de afuera (Mercado Pago) y otros módulos
└── payments.module.ts   arma el módulo y exporta lo que pueden usar los demás
```

Un pedido recorre siempre el mismo camino:

```
controller → service → repository → MySQL
   (valida)   (reglas)   (SQL)
```

Cada archivo dice en el nombre qué es: `cobro.model.ts`, `caja.usecases.ts`,
`pagos.controller.ts`, `pagos.dto.ts`.

### Por qué así

- **Cada cosa en su lugar.** Si hay que tocar algo de la caja, está todo en
  `modules/payments/`. No hay que buscar en todo el proyecto.
- **Las reglas del negocio no dependen de la base ni de Express.** Un service
  usa interfaces (por ejemplo "un lugar donde guardar cobros") y el `.module.ts`
  le pasa la implementación con MySQL. Por eso las reglas se pueden probar con
  tests sin base de datos.
- **Los módulos no se meten en las tablas de los otros.** Cada tabla tiene un
  solo módulo dueño. Si turnos necesita algo de clientas, se lo pide a la
  fachada de `customers`; no escribe en la tabla `clientes`.
- **El frontend recibe solo lo que usa.** Ningún controller devuelve una fila
  entera de la base: todo sale por un DTO que elige campo por campo. Así no se
  filtran datos (como el hash de una contraseña) y la API no cambia si cambia
  una tabla.

Es arquitectura en capas + clean architecture + MVC, organizada por dominio:
`models` es el dominio, `services` los casos de uso, `repositories` e
`integrations` la infraestructura, y `controllers` + `schemas` la capa HTTP.

`orders` es la parte de Alan: está en su módulo, pero todavía con su
estructura original.

## Frontend

Dos apps separadas:

- **`cliente/`** es la web pública: un solo sitio para reservar un turno o
  comprar, sin recargar.
- **`admin/`** es el panel. Es otra app porque tiene otro usuario y otro login,
  y no tiene sentido mandarle el código del panel a cada visitante de la web.

Las dos hablan solo con la API: no comparten datos por el navegador. Lo que
usan las dos (colores, tipografías, tipos) está en `frontend/shared/`.

## Más detalle

- [`backend/README.md`](backend/README.md): puesta en marcha, endpoints, Mercado Pago.
- [`database/README.md`](database/README.md): cómo se versiona la base.
