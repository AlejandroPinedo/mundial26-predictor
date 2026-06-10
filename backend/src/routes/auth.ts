import { Hono } from 'hono'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from '../db.js'
import { rateLimit } from '../middleware/rateLimit.js'
import { authMiddleware } from '../middleware/auth.js'
import { validateUsername } from '../utils/validation.js'
import type { AppVariables } from '../types.js'

export const authRouter = new Hono<{ Variables: AppVariables }>()

const JWT_EXPIRY = 60 * 60 * 24 * 60 // 60 days

function signToken(user: { id: string; username: string; is_admin: boolean }) {
  return jwt.sign(
    { userId: user.id, username: user.username, isAdmin: user.is_admin },
    process.env.JWT_SECRET!,
    { expiresIn: JWT_EXPIRY }
  )
}

function userPayload(user: { id: string; email: string; username: string; is_admin: boolean; avatar_url?: string }) {
  return { id: user.id, email: user.email, username: user.username, isAdmin: user.is_admin, avatarUrl: user.avatar_url }
}

async function findOrCreateOAuthUser(opts: {
  provider: string; oauthId: string; email: string; name: string; avatar?: string
}) {
  const { provider, oauthId, email, name, avatar } = opts

  let result = await db.query(
    'SELECT * FROM users WHERE oauth_provider = $1 AND oauth_id = $2',
    [provider, oauthId]
  )

  if (!result.rows[0]) {
    result = await db.query('SELECT * FROM users WHERE email = $1', [email])
    if (result.rows[0]) {
      await db.query(
        'UPDATE users SET oauth_provider = $1, oauth_id = $2, avatar_url = $3 WHERE id = $4',
        [provider, oauthId, avatar, result.rows[0].id]
      )
      result = await db.query('SELECT * FROM users WHERE id = $1', [result.rows[0].id])
    } else {
      const base = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15)
      const username = base + Math.random().toString(36).slice(2, 5)
      result = await db.query(
        'INSERT INTO users (email, username, oauth_provider, oauth_id, avatar_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [email, username, provider, oauthId, avatar]
      )
    }
  }

  const user = result.rows[0]
  return { token: signToken(user), user: userPayload(user) }
}

// ── Standard auth ─────────────────────────────────────────────────────────────

authRouter.post('/register', rateLimit(5, 60_000), async (c) => {
  try {
    const { email, username, password } = await c.req.json()
    if (!email || !username || !password) return c.json({ error: 'Todos los campos son requeridos' }, 400)
    if (password.length < 6) return c.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, 400)
    const usernameError = validateUsername(username)
    if (usernameError) return c.json({ error: usernameError }, 400)

    const passwordHash = await bcrypt.hash(password, 10)
    const result = await db.query(
      'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id, email, username',
      [email, username.trim(), passwordHash]
    )
    return c.json({ user: result.rows[0] }, 201)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    const duplicate = msg.includes('duplicate') || msg.includes('unique')
    return c.json({ error: duplicate ? 'Email o usuario ya existe' : 'Error al registrarse' }, 400)
  }
})

authRouter.post('/login', rateLimit(10, 60_000), async (c) => {
  try {
    const { email, password } = await c.req.json()
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email])
    const user = result.rows[0]
    if (!user || !user.password_hash) return c.json({ error: 'Credenciales inválidas' }, 401)

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return c.json({ error: 'Credenciales inválidas' }, 401)

    return c.json({ token: signToken(user), user: userPayload(user) })
  } catch {
    return c.json({ error: 'Error al iniciar sesión' }, 500)
  }
})

authRouter.post('/change-password', authMiddleware, rateLimit(5, 60_000), async (c) => {
  try {
    const userId = c.get('userId')
    const { currentPassword, newPassword } = await c.req.json()
    if (!currentPassword || !newPassword) return c.json({ error: 'Ambas contraseñas son requeridas' }, 400)
    if (newPassword.length < 6) return c.json({ error: 'Mínimo 6 caracteres' }, 400)

    const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId])
    if (!result.rows[0].password_hash) return c.json({ error: 'Esta cuenta usa login social' }, 400)

    const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash)
    if (!valid) return c.json({ error: 'Contraseña actual incorrecta' }, 401)

    const newHash = await bcrypt.hash(newPassword, 10)
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId])
    return c.json({ message: 'Contraseña actualizada' })
  } catch {
    return c.json({ error: 'Error al cambiar contraseña' }, 500)
  }
})

authRouter.post('/change-username', authMiddleware, rateLimit(5, 60_000), async (c) => {
  try {
    const userId = c.get('userId')
    const { newUsername } = await c.req.json()

    const validationError = validateUsername(newUsername)
    if (validationError) return c.json({ error: validationError }, 400)

    const username = (newUsername as string).trim()
    const current = await db.query('SELECT username FROM users WHERE id = $1', [userId])
    if (current.rows[0]?.username === username) {
      return c.json({ error: 'Ese ya es tu nombre de usuario' }, 400)
    }

    const result = await db.query(
      'UPDATE users SET username = $1 WHERE id = $2 RETURNING *',
      [username, userId]
    )
    const user = result.rows[0]
    // El JWT incluye el username como claim — se reemite para que no quede obsoleto
    return c.json({
      token: signToken(user),
      user: userPayload(user),
      message: 'Nombre de usuario actualizado',
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    const duplicate = msg.includes('duplicate') || msg.includes('unique')
    return c.json({ error: duplicate ? 'Ese nombre de usuario ya está en uso' : 'Error al cambiar el nombre de usuario' }, duplicate ? 400 : 500)
  }
})

// ── Google OAuth ──────────────────────────────────────────────────────────────

authRouter.get('/google', (c) => {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!)
  url.searchParams.set('redirect_uri', process.env.GOOGLE_REDIRECT_URI!)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'email profile')
  url.searchParams.set('access_type', 'online')
  return c.redirect(url.toString())
})

authRouter.get('/callback/google', async (c) => {
  const code = c.req.query('code')
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  if (!code) return c.redirect(`${frontendUrl}/login?error=cancelled`)

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, grant_type: 'authorization_code',
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      }),
    })
    const tokenData = await tokenRes.json() as { access_token: string }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const g = await userRes.json() as { id: string; email: string; name: string; picture?: string }

    const { token, user } = await findOrCreateOAuthUser({
      provider: 'google', oauthId: g.id, email: g.email, name: g.name, avatar: g.picture,
    })

    const params = new URLSearchParams({ token, user: JSON.stringify(user) })
    return c.redirect(`${frontendUrl}/auth/callback?${params}`)
  } catch {
    return c.redirect(`${frontendUrl}/login?error=oauth_failed`)
  }
})

// ── GitHub OAuth ──────────────────────────────────────────────────────────────

authRouter.get('/github', (c) => {
  const url = new URL('https://github.com/login/oauth/authorize')
  url.searchParams.set('client_id', process.env.GITHUB_CLIENT_ID!)
  url.searchParams.set('redirect_uri', process.env.GITHUB_REDIRECT_URI!)
  url.searchParams.set('scope', 'user:email')
  return c.redirect(url.toString())
})

authRouter.get('/callback/github', async (c) => {
  const code = c.req.query('code')
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  if (!code) return c.redirect(`${frontendUrl}/login?error=cancelled`)

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        code,
        client_id: process.env.GITHUB_CLIENT_ID!,
        client_secret: process.env.GITHUB_CLIENT_SECRET!,
        redirect_uri: process.env.GITHUB_REDIRECT_URI!,
      }),
    })
    const tokenData = await tokenRes.json() as { access_token: string }

    const [userRes, emailsRes] = await Promise.all([
      fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${tokenData.access_token}`, 'User-Agent': 'Mundial26' },
      }),
      fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${tokenData.access_token}`, 'User-Agent': 'Mundial26' },
      }),
    ])
    const gh = await userRes.json() as { id: number; login: string; name?: string; avatar_url?: string }
    const emails = await emailsRes.json() as { email: string; primary: boolean; verified: boolean }[]
    const primary = emails.find(e => e.primary && e.verified)?.email || `${gh.login}@github.local`

    const { token, user } = await findOrCreateOAuthUser({
      provider: 'github', oauthId: String(gh.id),
      email: primary, name: gh.name || gh.login, avatar: gh.avatar_url,
    })

    const params = new URLSearchParams({ token, user: JSON.stringify(user) })
    return c.redirect(`${frontendUrl}/auth/callback?${params}`)
  } catch {
    return c.redirect(`${frontendUrl}/login?error=oauth_failed`)
  }
})
