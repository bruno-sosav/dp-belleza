# @dp/shared

Lo que usan **las dos** apps del frontend (`cliente/` y `admin/`).

| Carpeta | Qué es | Cuándo haya API |
|---|---|---|
| `lib/` | `formatPrice`, `formatTelefono`, `categoriesOf` | Se queda |
| `types/servicio.types.ts` | Tipo `Service`: el contrato de `GET /api/turnos/servicios` | — |
| `types/producto.types.ts` | Tipos `Producto` y `Categoria`: el contrato de `GET /api/tienda/productos` | — |
| `styles/theme.css` | Tokens de Tailwind (colores, tipografías) y estilos base | Se queda |

**No agregar acá** componentes de React, lógica de una sola app, ni nada que
use `localStorage`: el almacenamiento del navegador no se comparte entre
`dpbelleza.com.ar` y `admin.dpbelleza.com.ar`.
