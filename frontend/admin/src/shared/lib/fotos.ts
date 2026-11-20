/** La web pública: ahí están las fotos guardadas en el proyecto (public/fotos). */
const SITE_URL = import.meta.env.VITE_SITE_URL ?? "http://localhost:5173"

const FOTO_DE_LA_WEB = /^\/fotos\/[\w./-]+$/

/** Una foto puede ser un link completo o una foto de la web ("/fotos/..."). */
export const esFoto = (texto: string) => /^https?:\/\/\S+$/.test(texto.trim()) || FOTO_DE_LA_WEB.test(texto.trim())

/** El panel es otra app: a las fotos de la web les suma la dirección de la web para poder mostrarlas. */
export const verFoto = (url: string) => (FOTO_DE_LA_WEB.test(url) ? SITE_URL + url : url)
