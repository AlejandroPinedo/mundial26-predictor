import { Hono } from 'hono'
import { db } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import type { AppVariables } from '../types.js'

export const groupsRouter = new Hono<{ Variables: AppVariables }>()

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

groupsRouter.post('/', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { name } = await c.req.json()

  if (!name?.trim()) return c.json({ error: 'Name is required' }, 400)

  let invite_code = generateCode()
  let attempts = 0
  while (attempts < 5) {
    const existing = await db.query('SELECT id FROM groups WHERE invite_code = $1', [invite_code])
    if (!existing.rows[0]) break
    invite_code = generateCode()
    attempts++
  }

  const result = await db.query(
    'INSERT INTO groups (name, invite_code, created_by) VALUES ($1, $2, $3) RETURNING *',
    [name.trim(), invite_code, userId]
  )

  await db.query(
    'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
    [result.rows[0].id, userId]
  )

  return c.json({ group: result.rows[0] }, 201)
})

groupsRouter.post('/join', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { inviteCode } = await c.req.json()

  const group = await db.query('SELECT * FROM groups WHERE invite_code = $1', [inviteCode?.toUpperCase()])
  if (!group.rows[0]) return c.json({ error: 'Código inválido' }, 404)

  try {
    await db.query(
      'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
      [group.rows[0].id, userId]
    )
  } catch {
    return c.json({ error: 'Ya eres miembro de este grupo' }, 400)
  }

  return c.json({ group: group.rows[0] })
})

groupsRouter.get('/my', authMiddleware, async (c) => {
  const userId = c.get('userId')

  const result = await db.query(
    `SELECT g.*, COUNT(gm2.user_id) as member_count
     FROM groups g
     JOIN group_members gm ON g.id = gm.group_id
     LEFT JOIN group_members gm2 ON g.id = gm2.group_id
     WHERE gm.user_id = $1
     GROUP BY g.id
     ORDER BY g.created_at DESC`,
    [userId]
  )

  return c.json({ groups: result.rows })
})

groupsRouter.get('/:id/leaderboard', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const groupId = c.req.param('id')

  const member = await db.query(
    'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
    [groupId, userId]
  )
  if (!member.rows[0]) return c.json({ error: 'No eres miembro de este grupo' }, 403)

  const result = await db.query(
    `SELECT u.username,
            COUNT(p.id) as total_predictions,
            COALESCE(SUM(p.points), 0) + COALESCE(bp.points, 0) as total_points
     FROM group_members gm
     JOIN users u ON gm.user_id = u.id
     LEFT JOIN predictions p ON u.id = p.user_id
     LEFT JOIN (
       SELECT bp.user_id, SUM(
         CASE bp.round
           WHEN 'quarter' THEN 1
           WHEN 'semi' THEN 3
           WHEN 'finalist' THEN 5
           WHEN 'champion' THEN 10
           ELSE 0
         END
       ) as points
       FROM bracket_predictions bp
       JOIN bracket_results br ON bp.round = br.round AND bp.team = br.team
       GROUP BY bp.user_id
     ) bp ON u.id = bp.user_id
     WHERE gm.group_id = $1
     GROUP BY u.id, u.username, bp.points
     ORDER BY total_points DESC`,
    [groupId]
  )

  const group = await db.query('SELECT * FROM groups WHERE id = $1', [groupId])

  return c.json({ group: group.rows[0], leaderboard: result.rows })
})
