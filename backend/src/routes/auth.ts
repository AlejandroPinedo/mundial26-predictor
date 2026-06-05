import { Hono } from 'hono'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from '../db.js'
import { rateLimit } from '../middleware/rateLimit.js'
import { authMiddleware } from '../middleware/auth.js'
import type { AppVariables } from '../types.js'

export const authRouter = new Hono<{ Variables: AppVariables }>()

authRouter.post('/register', rateLimit(5, 60_000), async (c) => {
  try {
    const { email, username, password } = await c.req.json()

    if (!email || !username || !password) {
      return c.json({ error: 'email, username and password are required' }, 400)
    }

    if (password.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters' }, 400)
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const result = await db.query(
      'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id, email, username',
      [email, username, passwordHash]
    )

    return c.json({ user: result.rows[0] }, 201)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Registration failed'
    const duplicate = msg.includes('duplicate') || msg.includes('unique')
    return c.json({ error: duplicate ? 'Email or username already exists' : 'Registration failed' }, 400)
  }
})

authRouter.post('/login', rateLimit(10, 60_000), async (c) => {
  try {
    const { email, password } = await c.req.json()

    const result = await db.query('SELECT * FROM users WHERE email = $1', [email])
    const user = result.rows[0]

    if (!user) return c.json({ error: 'Invalid credentials' }, 401)

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return c.json({ error: 'Invalid credentials' }, 401)

    const token = jwt.sign(
      { userId: user.id, username: user.username, isAdmin: user.is_admin },
      process.env.JWT_SECRET!,
      { expiresIn: 60 * 60 * 24 * 7 }
    )

    return c.json({
      token,
      user: { id: user.id, email: user.email, username: user.username, isAdmin: user.is_admin }
    })
  } catch {
    return c.json({ error: 'Login failed' }, 500)
  }
})

authRouter.post('/change-password', authMiddleware, rateLimit(5, 60_000), async (c) => {
  try {
    const userId = c.get('userId')
    const { currentPassword, newPassword } = await c.req.json()

    if (!currentPassword || !newPassword) {
      return c.json({ error: 'Both passwords are required' }, 400)
    }
    if (newPassword.length < 6) {
      return c.json({ error: 'New password must be at least 6 characters' }, 400)
    }

    const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId])
    const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash)
    if (!valid) return c.json({ error: 'Contraseña actual incorrecta' }, 401)

    const newHash = await bcrypt.hash(newPassword, 10)
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId])

    return c.json({ message: 'Contraseña actualizada' })
  } catch {
    return c.json({ error: 'Error al cambiar contraseña' }, 500)
  }
})
