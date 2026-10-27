# dp-belleza

[![CI](https://github.com/bruno-sosav/dp-belleza/actions/workflows/ci.yml/badge.svg)](https://github.com/bruno-sosav/dp-belleza/actions/workflows/ci.yml)

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
npm run lint         # análisis estático (oxlint)
```

### Reportes

```bash
npm run cobertura    # tests unitarios + integración con cobertura -> backend/coverage/todo/index.html
npm run complejidad  # complejidad ciclomática por función         -> reportes/complejidad.html y .csv
npm run e2e          # tests end to end con Playwright             -> reportes/e2e/index.html
```

La cobertura necesita la base levantada (corre los tests de integración). La
complejidad usa [lizard](https://github.com/terryyin/lizard), que es de Python:
`pip3 install lizard jinja2`. El E2E abre un Chromium de verdad (la primera vez:
`npx playwright install chromium`) y reusa la API y las dos apps si ya están
corriendo. Los reportes no se suben al repo.

### CI

Cada push y cada PR a `main` corre [GitHub Actions](.github/workflows/ci.yml)
con cuatro trabajos:

| Trabajo | Qué hace |
|---|---|
| Calidad | lint, tipos del backend, build de las dos apps y tests unitarios |
| Cobertura | levanta MySQL, corre migraciones y seeds, tests unitarios + integración con cobertura |
| E2E | levanta MySQL, la API, la web y el panel, y Playwright recorre una reserva de punta a punta |
| Complejidad | reporte de complejidad ciclomática |

Si algo falla, el push queda marcado en rojo. Los reportes quedan para
descargar en cada corrida (pestaña *Actions* → la corrida → *Artifacts*).

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

## Arquitectura del frontend

Son dos apps de React separadas, más un paquete con lo que comparten:

- **`cliente/`**: la web pública (dpbelleza.com.ar), para reservar un turno o comprar.
- **`admin/`**: el panel de la dueña (admin.dpbelleza.com.ar). Es otra app porque
  tiene otro usuario y otro login, y no tiene sentido mandarle el código del panel
  a cada visitante de la web.
- **`shared/`** (`@dp/shared`): colores, tipografías, tipos y formatos que usan las dos.

Las dos hablan solo con la API: no comparten datos por el navegador.

Adentro, las dos apps tienen la misma forma. Están divididas **por feature**:
cada sección del sitio es una carpeta, igual que los módulos del backend.

```
admin/src/
├── app/                  arranque, rutas y el marco del panel (menú, login)
├── features/
│   ├── today/            Hoy
│   ├── appointments/     Turnos: agenda, horario, días cerrados, reglas
│   ├── reminders/        Recordatorios
│   ├── customers/        Clientas
│   ├── catalog/          Servicios
│   ├── ecommerce/        Productos de la tienda
│   ├── payments/         Finanzas → Caja
│   ├── analytics/        Finanzas → Análisis
│   ├── settings/         Ajustes: tu negocio, Mercado Pago
│   └── auth/             login y "Tu cuenta"
└── shared/               lo que usan varias secciones del panel

cliente/src/
├── app/                  arranque y rutas
├── features/
│   ├── home/             portada y contacto
│   ├── ecommerce/        tienda, carrito y checkout
│   └── turnera/          servicios, reservar, mi turno, pago de seña
└── shared/               navbar, footer, layout
```

Y adentro de cada feature, las mismas carpetas (solo las que usa):

```
features/appointments/
├── pages/          una pantalla por ruta: AgendaPage.tsx, SchedulePage.tsx…
├── components/     piezas de esas pantallas: SemanaGrilla, TurnoFila…
├── api/            los pedidos al backend: turnos.api.ts, agenda.api.ts
└── lib/            cuentas propias de la sección, sin React
```

Una pantalla recorre siempre el mismo camino:

```
page → components → api → backend
       (muestran)   (pide)
```

Las páginas se llaman `XxxPage.tsx` y los pedidos `xxx.api.ts`, con el mismo
nombre que el controller del backend al que le pegan (`turnos.api.ts` →
`turnos.controller.ts`).

### Por qué así

- **Es la misma idea que el backend.** `features/` es `modules/`, `pages/` son
  los `controllers/` (reciben al usuario), `api/` son los `repositories/`
  (hablan con la fuente de datos) y `shared/` es `core/`.
- **Cada cosa en su lugar.** Todo lo de la caja está en `features/payments/`.
  Antes el panel estaba ordenado por tipo de archivo (`pages/`, `components/`,
  `data/`) y para tocar una sección había que abrir cuatro carpetas.
- **Lo compartido sube de a un nivel.** Algo arranca en su feature. Si lo
  necesita otra sección, pasa a `src/shared/`, y si lo necesitan las dos apps,
  a `frontend/shared/`.
- **Las reglas están en el backend.** El front muestra y pide: no calcula
  estadísticas ni decide si un turno se puede mover. Si el backend rechaza
  algo, el front muestra el mensaje que vino.
- **Sin librerías de más.** No hay Redux ni react-query: cada pantalla pide lo
  suyo con un hook (`useApi`) que maneja cargando, error y recargar.

### Cuántos datos pide

El front nunca recibe una tabla entera. Pide lo que la pantalla muestra:

| Pantalla | Qué pide |
|---|---|
| Agenda / Hoy | los turnos de esa semana o de ese día |
| Caja | los cobros de un día |
| Clientas | la búsqueda la hace el backend (SQL), tope de 500 |
| Ficha de una clienta | sus últimos 200 turnos y compras |
| Análisis | 180 días **ya sumados en SQL**: un número por día, no los turnos |
| Servicios | todos (son pocos y la web los muestra todos juntos) |

En el panel, "Ventas tienda" (`pages/AdminSales.tsx`) todavía no tiene
endpoint: espera `GET /api/admin/stats/productos`.

## Más detalle

- [`backend/README.md`](backend/README.md): puesta en marcha, endpoints, Mercado Pago.
- [`database/README.md`](database/README.md): cómo se versiona la base.
