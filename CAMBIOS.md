# Cambios — rama `rolo`

Resumen de lo que se hizo en esta rama respecto de `main`.

## 1. Reorganización de carpetas

El código salió de `src/` y quedó organizado **por módulo** en la raíz del proyecto:

| Antes | Ahora | Qué contiene |
|---|---|---|
| — | `landing/` | Página de inicio de la marca |
| `src/components`, `src/pages`, … | `ecommerce/` | Tienda online y base del sitio (rutas, navbar, footer) |
| `src/front-turnera/` | `turnera/` | Reserva de turnos (mismo código, solo cambió de lugar) |
| — | `admin/` | Panel de administración |
| `database/` | `base-de-datos/` | Scripts SQL |

Todas las carpetas siguen la misma estructura interna: `pages/`, `components/`, `data/`, `lib/`.
El [README](README.md) tiene el árbol completo y la tabla de rutas.

> **Si tenías cambios sin subir en `src/front-turnera/`:** ahora esos archivos están en `turnera/`.

## 2. Landing page (`/`)

- Nueva página de inicio que presenta **toda la marca**: estética (turnos) y tienda.
- Secciones: portada, "Qué hacemos", "Reservá en 3 pasos", tratamientos destacados, productos más vendidos, Nosotros, testimonios y "Visitanos".
- Los servicios y productos destacados se leen de `turnera/` y `ecommerce/`, así que siempre coinciden con lo que hay cargado.
- **"Nosotros" dejó de ser una página aparte** y pasó a ser una sección de la landing. El link del menú baja directo a esa sección, y `/nosotros` redirige ahí.
- Se eliminó el Home anterior (solo tienda), que la landing reemplaza.

## 3. Contacto por WhatsApp (`/contacto`)

- El formulario ya no queda "en el aire": al enviarlo, **abre WhatsApp con el mensaje armado** hacia el número del local.
- ⚠️ El número todavía es de ejemplo. Se cambia en `ecommerce/lib/whatsapp.ts`.

## 4. Panel de administración (`/admin`)

No hay ningún link al panel desde el sitio público: se entra escribiendo la dirección.

**Acceso**
- Pide contraseña. Se guarda solo el hash SHA-256, en `.env.local`, que **no se sube a git**. Para configurarlo:
  ```bash
  cp .env.example .env.local
  npm run admin:hash -- "tu-clave"   # pegar el resultado en .env.local
  ```

**Secciones**
| Sección | Qué hace |
|---|---|
| **Resumen** | Ganancia total, de turnos y de tienda, comparada con el período anterior. Gráfico de ganancias por día. Calendario rojo de días más movidos. Top de productos y servicios. |
| **Turnos** | Calendario de días movidos por cantidad de turnos, top 5 de días, promedio por día de la semana, ranking de servicios y cancelaciones. |
| **Ventas tienda** | Ventas por día, pedidos, unidades, ticket promedio, ranking de productos y productos sin ventas. |
| **Productos** | Agregar productos y **darlos de baja sin borrarlos** (se pueden reactivar). |

- Filtro de período (7 / 30 / 90 días) que afecta a toda la pantalla.
- Al tocar un día del calendario se ve su detalle: turnos, ganancia, **puesto en el período** y **comparación con el mismo día de la semana anterior**.
- Todos los gráficos tienen tooltip y opción "Ver como tabla".

## 5. Limitaciones actuales (falta backend)

| Tema | Hoy | Cuando haya API |
|---|---|---|
| Productos del admin | Se guardan en el navegador (localStorage) | Reemplazar `ecommerce/data/productStore.ts` |
| Estadísticas | Datos de **demostración** con la forma de las tablas `pedidos`, `pedido_items` y `turnos` | Reemplazar `admin/data/history.ts` |
| Login del panel | Se valida en el navegador (evita entradas casuales, no es seguridad real) | Validar en el servidor contra `usuarios.password_hash` |
| Fotos de productos | Se cargan como link | Subida de archivos |

## Cómo probarlo

```bash
npm install
cp .env.example .env.local   # y configurar la contraseña (ver arriba)
npm run dev
```

`npm run build` y `npm run lint` pasan sin errores.
