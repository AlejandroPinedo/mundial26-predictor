import 'dotenv/config'
import * as Sentry from '@sentry/node'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { db } from './db.js'
import { authRouter } from './routes/auth.js'
import { authMiddleware } from './middleware/auth.js'
import type { AppVariables } from './types.js'
import { predictionsRouter } from './routes/predictions.js'
import { cors } from 'hono/cors'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  enabled: !!process.env.SENTRY_DSN,
  tracesSampleRate: 0.5,
})

const app = new Hono<{ Variables: AppVariables }>()

app.use('/*', cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
}))

app.get('/', (c) => {
  return c.json({ message: 'Mundial26 API running', status: 'ok' })
})

app.get('/health', (c) => {
  return c.json({ status: 'healthy', env: process.env.NODE_ENV })
})

app.get('/db-check', async (c) => {
  const result = await db.query('SELECT COUNT(*) FROM matches')
  return c.json({ matches: result.rows[0].count })
})

app.route('/auth', authRouter)

app.route('/predictions', predictionsRouter)

app.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const result = await db.query(
    'SELECT id, email, username, created_at FROM users WHERE id = $1',
    [userId]
  )
  return c.json({ user: result.rows[0] })
})

const port = Number(process.env.PORT) || 3000

serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running on http://localhost:${port}`)
})