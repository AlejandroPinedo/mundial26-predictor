import { createMiddleware } from 'hono/factory'

const requests = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(maxRequests: number, windowMs: number) {
  return createMiddleware(async (c, next) => {
    const ip = c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip') || 'unknown'
    const now = Date.now()
    const key = `${ip}:${c.req.path}`
    const record = requests.get(key)

    if (!record || now > record.resetAt) {
      requests.set(key, { count: 1, resetAt: now + windowMs })
      return next()
    }

    if (record.count >= maxRequests) {
      return c.json({ error: 'Demasiados intentos. Espera un momento.' }, 429)
    }

    record.count++
    return next()
  })
}
