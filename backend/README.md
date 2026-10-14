# backend

**Todavía no arrancó.** Esta carpeta es el esqueleto acordado, para que cuando
empiece nadie tenga que decidir dónde va su código.

## Regla principal: UNA sola app, módulos adentro

`src/turnera/` y `src/ecommerce/` **no son dos servidores**. Son dos grupos de
rutas que se montan en la misma aplicación, con una sola conexión a la base y un
solo login:

```
/api/turnos/*     ->  src/turnera/
/api/tienda/*     ->  src/ecommerce/
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

Por eso la operación "dado un teléfono, dame el cliente o creálo" se escribe
**una vez** en `shared/` y la llaman los dos módulos. Si cada equipo la escribe
por su lado:

- ecommerce hace `INSERT` y revienta contra el UNIQUE cuando el cliente ya existe, o
- cada uno normaliza el teléfono distinto (`5492231234567` vs `0223 123-4567`),
  la base guarda dos clientes, **ninguna constraint se queja** y la dueña termina
  con la misma persona duplicada: los turnos en un registro y las compras en el otro.

Regla: **una tabla = un model = un dueño.** Lo mismo para `usuarios` y `configuracion`.

## Estructura

```
src/
├── shared/
│   ├── models/      todas las tablas (SQLAlchemy / Prisma / lo que se elija)
│   ├── db            conexión, una sola
│   ├── auth          login, JWT, roles
│   └── config
├── turnera/         routes + service + validación   (sub-equipo A)
├── ecommerce/       routes + service + validación   (sub-equipo B)
└── admin/           endpoints del panel
```

## Pendiente de decidir, antes del primer endpoint

| Tema | Estado |
|---|---|
| **Stack: Node o Python** | Sin decidir. El equipo propuso Node. **Hay que cerrarlo y escribirlo acá**, el peor escenario es dos personas arrancando en dos stacks |
| Contrato de la API | Sin escribir. Los endpoints de arriba son la propuesta |
| CORS | Tiene que permitir los dos orígenes: `dpbelleza.com.ar` y `admin.dpbelleza.com.ar` |
| Sesión | Si se comparte entre los dos dominios, la cookie va al dominio padre (`.dpbelleza.com.ar`) |

La arquitectura de carpetas es la misma en Node o en Python: lo que la define es
un deployable con módulos por dominio y los models compartidos, no el lenguaje.
