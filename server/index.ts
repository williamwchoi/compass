import { app } from './app.js'

const PORT = Number(process.env.PORT ?? 4001)
app.listen(PORT, () => console.log(`Compass API on http://localhost:${PORT}`))
