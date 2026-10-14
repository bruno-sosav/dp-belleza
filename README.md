# dp-belleza

Sistema de gestión para la estética **Dp.belleza**: web pública con turnera y
tienda online, más un panel de administración para la dueña del local.

Monorepo con las tres partes del sistema: `database/`, `backend/`, `frontend/`.

Stack del frontend: React 19 · TypeScript · Vite · Tailwind CSS 4 · React Router 7.

## Cómo correrlo

```bash
npm install          # instala las dos apps de una sola vez (npm workspaces)

npm run dev          # web pública   -> http://localhost:5173
npm run dev:admin    # panel         -> http://localhost:5174

npm run build        # typecheck + build de las dos apps
npm run lint         # oxlint
```

Para entrar al panel hay que configurar la contraseña primero:

```bash
cp frontend/admin/.env.example frontend/admin/.env.local
npm run admin:hash -- "tu-clave"    # pegar el hash en .env.local
```

## Estructura

```
dp-belleza/
├── database/                 BASE DE DATOS
│   ├── migrations/           Scripts SQL versionados (V1_, V2_, ...)
│   └── seeds/                Datos de ejemplo para desarrollo
│
├── backend/                  API (Node + Express) — ver backend/README.md
│   └── src/
│       ├── shared/           models de TODAS las tablas, db, auth, config
│       ├── turnera/          rutas /api/turnos       (sub-equipo A, pendiente)
│       ├── ecommerce/        rutas /api/tienda       (sub-equipo B, hecho)
│       └── admin/            rutas /api/admin
│
└── frontend/
    ├── shared/               @dp/shared — lo que usan las DOS apps
    │   ├── data/             MOCK: catálogo de productos y servicios
    │   ├── lib/              formatPrice
    │   └── styles/           theme.css (colores y tipografías)
    │
    ├── cliente/              WEB PÚBLICA  ->  dpbelleza.com.ar
    │   └── src/
    │       ├── App.tsx       rutas públicas
    │       ├── shared/       Layout, Navbar, Footer, 404
    │       ├── home/         página de inicio, Nosotros y Contacto
    │       ├── turnera/      reserva de turnos
    │       └── ecommerce/    tienda
    │
    └── admin/                PANEL  ->  admin.dpbelleza.com.ar
        └── src/
            ├── App.tsx       rutas del panel
            ├── components/   AdminLayout (menú + login), charts/
            ├── data/         history.ts (MOCK), productStore.ts
            ├── lib/          auth, stats, format, usePeriod, styles
            └── pages/        Resumen, Turnos, Ventas, Productos
```

### Por qué dos apps y no una

- La web pública es **un solo sitio**: la clienta pasa de reservar un turno a
  comprar un producto con el mismo navbar y sin recargar. Turnera y tienda son
  módulos de la misma app.
- El panel es **otra app**: otro usuario, otro login, y no corresponde mandarle
  su JavaScript a cada visitante de la tienda.

### Qué va en cada subcarpeta

| Carpeta | Contenido |
|---|---|
| `pages/` | Una pantalla completa, asociada a una ruta en el `App.tsx` de su app |
| `components/` | Piezas de UI reutilizables dentro de las páginas |
| `context/` | Estado global compartido con React Context |
| `data/` | Tipos, datos mock y acceso a datos (a futuro, llamadas a la API) |
| `lib/` | Funciones auxiliares (formateo, constantes de estilos) |

### Reglas para mantener el orden

- **Las dos apps no se importan entre sí.** Si el panel y la web necesitan lo
  mismo, va en `frontend/shared/`. Si no, va en la app que lo usa.
- **En `frontend/shared/` no va nada que use `localStorage`**: el navegador aísla
  el almacenamiento por dominio, y las dos apps viven en dominios distintos.
- Toda página nueva se registra en el `App.tsx` **de su app**.
- Todo SQL va en `database/migrations/`, nunca duplicado en `backend/`.
- Un módulo nuevo del front va dentro de la app que lo usa, no en la raíz.

## Rutas

### Web pública — `dpbelleza.com.ar`

| URL | Página | Módulo |
|---|---|---|
| `/` | Home | home |
| `/nosotros` | Redirige a `/#nosotros` | home |
| `/contacto` | Contact | home |
| `/tienda` | Shop | ecommerce |
| `/producto/:id` | ProductDetail | ecommerce |
| `/carrito` | Cart | ecommerce |
| `/checkout` | Checkout | ecommerce |
| `/servicios` | Services | turnera |
| `/servicios/:id` | ServiceDetail | turnera |
| `/reservar/:id` | Booking | turnera |
| `/reserva-confirmada` | BookingConfirmed | turnera |

### Panel — `admin.dpbelleza.com.ar`

| URL | Página |
|---|---|
| `/` | Resumen |
| `/turnos` | Turnos |
| `/ventas` | Ventas tienda |
| `/productos` | Productos |
| `/productos/nuevo` | Alta de producto |

No hay ningún link al panel desde el sitio público.

## Estado actual: falta el backend

Todo el frontend está hardcodeado. Nada persiste, no hay una sola llamada HTTP.

| Tema | Hoy | Cuando haya API |
|---|---|---|
| Catálogo de productos y servicios | Constantes en `frontend/shared/data/` | Productos: `GET /api/tienda/productos` (ya existe). Servicios: `GET /api/servicios` |
| Estadísticas del panel | 6 meses de datos de demo en `admin/src/data/history.ts`, con la forma de las tablas `pedidos`, `pedido_items` y `turnos` | Reemplazar ese archivo por las llamadas reales |
| Alta de productos del panel | `admin/src/data/productStore.ts` (localStorage) | `POST /api/admin/productos` (ya existe) |
| Login del panel | Hash SHA-256 comparado en el navegador. Evita entradas casuales; **no es seguridad real** | `POST /api/auth/login` contra `usuarios.password_hash` (ya existe) |
| Reserva de turno | No persiste nada | `POST /api/turnos` |
| Fotos de productos | Se cargan como link | Subida de archivos |

> ⚠️ **Un producto cargado en el panel no aparece en la web.** El panel guarda en
> el `localStorage` de su propio dominio, y el navegador no lo comparte con
> `dpbelleza.com.ar`. No es un bug que se pueda arreglar desde el frontend: el
> canal entre el panel y la web es la base de datos.

> ⚠️ Los textos de la página de inicio (`frontend/cliente/src/home/data/content.ts`)
> son de relleno: testimonios, métricas y dirección inventados. Hay que
> reemplazarlos por los datos reales antes de mostrar el sitio.
