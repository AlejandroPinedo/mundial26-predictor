  import { serve } from '@hono/node-server'
  import { Hono } from 'hono'

  const app = new Hono()
  
  app.get('/', (c) => {
    return c.json({ message: 'Mundial26 API running', status: 'ok' })
  })

  app.get('/health', (c) => {
    return c.json({ status: 'healthy', env: process.env.NODE_ENV })
  })
  
  const port = Number(process.env.PORT) || 3000

  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}`)                           
  })
