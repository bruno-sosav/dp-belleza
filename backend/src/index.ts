import { app } from "./app.js"
import { config } from "./shared/config.js"

app.listen(config.port, () => {
  console.log(`API de DP Belleza escuchando en http://localhost:${config.port}`)
})
