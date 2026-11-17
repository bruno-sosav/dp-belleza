import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Connect, type Plugin } from 'vite'

/**
 * Páginas que existen (las mismas rutas que src/app/App.tsx). Si agregan una
 * página nueva, súmenla acá también, o el documento va a salir con 404.
 */
const PAGINAS = [
  /^\/$/,
  /^\/nosotros$/,
  /^\/contacto$/,
  /^\/tienda$/,
  /^\/producto\/[^/]+$/,
  /^\/carrito$/,
  /^\/checkout$/,
  /^\/pedido\/pago$/,
  /^\/servicios$/,
  /^\/servicios\/[^/]+$/,
  /^\/reservar\/[^/]+$/,
  /^\/reserva-confirmada$/,
  /^\/mi-turno$/,
  /^\/reserva\/pago$/,
]

/**
 * La web es una SPA: a cualquier dirección se le manda el mismo index.html y
 * React elige qué mostrar. Sin esto, una dirección inexistente sale 200 aunque
 * se vea "No encontrado". Con esto el documento sale 404 (y React igual muestra
 * la página de no encontrado). Si existe la ruta pero no el dato (/servicios/99999),
 * el 404 lo da la API en el fetch.
 */
function paginasInexistentes404(): Plugin {
  const marcar: Connect.NextHandleFunction = (req, res, next) => {
    const ruta = (req.url ?? '/').split(/[?#]/)[0].replace(/(.)\/$/, '$1')
    const pideUnaPagina =
      req.method === 'GET' && req.headers.accept?.includes('text/html') && !ruta.includes('.') && !ruta.startsWith('/@')
    if (pideUnaPagina && !PAGINAS.some((p) => p.test(ruta))) {
      // Vite responde con 200 por su cuenta; forzamos el 404 al escribir la cabecera.
      const writeHead = res.writeHead.bind(res) as (status: number, ...resto: unknown[]) => typeof res
      res.writeHead = ((_status: number, ...resto: unknown[]) => writeHead(404, ...resto)) as typeof res.writeHead
      res.statusCode = 404
    }
    next()
  }
  return {
    name: 'paginas-inexistentes-404',
    configureServer: (server) => void server.middlewares.use(marcar),
    configurePreviewServer: (server) => void server.middlewares.use(marcar),
  }
}

// Web pública — dpbelleza.com.ar
export default defineConfig({
  plugins: [react(), tailwindcss(), paginasInexistentes404()],
  // El monorepo tiene frontend/shared/ fuera del root de esta app.
  server: { fs: { allow: ['../..'] } },
})
