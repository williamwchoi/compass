// Vercel serverless entry — reuses the same Express app as local dev.
// vercel.json rewrites /api/* to this function; Express matches the full path.
import { app } from '../server/app.js'

export default app
