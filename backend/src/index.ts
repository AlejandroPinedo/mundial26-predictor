import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { db } from './db.js'

const app = new Hono()

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

const port = Number(process.env.PORT) || 3000

serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running on http://localhost:${port}`)
})