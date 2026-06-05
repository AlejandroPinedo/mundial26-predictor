import { createMiddleware } from 'hono/factory'
import jwt from 'jsonwebtoken'
import type { AppVariables } from '../types.js'

export const authMiddleware = createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid authorization header' }, 401)
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string
      username: string
    }
    c.set('userId', payload.userId)
    c.set('username', payload.username)
    await next()
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }
})