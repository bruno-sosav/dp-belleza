# @dp/shared

Lo que usan **las dos** apps del frontend (`cliente/` y `admin/`).

| Carpeta | Qué es | Cuándo haya API |
|---|---|---|
| `lib/` | `formatPrice`, `formatTelefono`, `categoriesOf` | Se queda |
| `types/servicio.types.ts` | Tipo `Service`: el contrato de `GET /api/turnos/servicios` | — |
| `styles/theme.css` | Tokens de Tailwind (colores, tipografías) y estilos base | Se queda |
| `data/products.ts` | **MOCK.** Catálogo de productos | Se reemplaza por `GET /api/tienda/productos` |

`data/` está acá porque productos y servicios son datos de dominio que las dos
apps necesitan leer: la web para venderlos, el panel para hacer estadísticas.
Hoy son constantes hardcodeadas; mañana son dos endpoints. Las pantallas no
cambian.

**No agregar acá** componentes de React, lógica de una sola app, ni nada que
use `localStorage`: el almacenamiento del navegador no se comparte entre
`dpbelleza.com.ar` y `admin.dpbelleza.com.ar`.
