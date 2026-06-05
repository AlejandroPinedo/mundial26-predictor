import { Hono } from 'hono'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from '../db.js'

export const authRouter = new Hono()                                                                                 

authRouter.post('/register', async (c) => {
  try {
    const { email, username, password } = await c.req.json()

    if (!email || !username || !password) {
      return c.json({ error: 'email, username and password are required' }, 400)
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

authRouter.post('/login', async (c) => {                                                                             
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
    user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isAdmin: user.is_admin
    }
    })                
  } catch {
    return c.json({ error: 'Login failed' }, 500)
  }
})
