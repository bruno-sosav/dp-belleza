import { app } from "./app.js"
import { config } from "./shared/config.js"
import { vencerSenas } from "./turnera/sena.js"

app.listen(config.port, () => {
  console.log(`API de DP Belleza escuchando en http://localhost:${config.port}`)
})

// Libera los horarios de las señas que vencieron sin pagar (ver turnera/sena.ts).
// Aunque esto no corriera, esos turnos ya no ocupan el horario: es para que en
// el panel figuren como cancelados.
const liberar = () => vencerSenas().catch((err) => console.error("No se pudieron vencer las señas:", err))
void liberar()
setInterval(liberar, 60_000)
