import { app } from "./app.js"
import { config } from "./shared/config.js"
import { pool } from "./shared/db.js"
import { vencerSenas } from "./turnera/sena.js"

const servidor = app.listen(config.port, () => {
  console.log(`API de DP Belleza escuchando en http://localhost:${config.port}`)
})

// Libera los horarios de las señas que vencieron sin pagar (ver turnera/sena.ts).
// Aunque esto no corriera, esos turnos ya no ocupan el horario: es para que en
// el panel figuren como cancelados.
const liberar = () => vencerSenas().catch((err) => console.error("No se pudieron vencer las señas:", err))
void liberar()
const relojSenas = setInterval(liberar, 60_000)

// Cierre prolijo (Ctrl+C, o la plataforma de deploy reiniciando): sin esto, el
// reloj de las señas y las conexiones a MySQL mantienen vivo el proceso y
// `tsx watch` lo tiene que matar a la fuerza.
let cerrando = false
function cerrar(senal: string) {
  if (cerrando) return
  cerrando = true
  console.log(`\n${senal}: cerrando la API…`)
  clearInterval(relojSenas)
  servidor.close(() => {
    pool.end().finally(() => process.exit(0))
  })
  // Si algún pedido queda colgado, no esperar para siempre.
  setTimeout(() => process.exit(0), 3_000).unref()
}
process.on("SIGINT", () => cerrar("SIGINT"))
process.on("SIGTERM", () => cerrar("SIGTERM"))
