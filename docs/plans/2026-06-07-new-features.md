# Mundial26 Predictor New Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement 5 new features (Stadiums gallery, Group chat wall, Head-to-Head comparisons, Bracket image export, and Community insights dashboard) to enrich user engagement.

**Architecture:** Initialize group chat table on Hono server startup, add Head-to-Head prediction fetching, and build frontend pages styled with Barlow and Outfit typography.

**Tech Stack:** React, Hono, PostgreSQL, Tailwind CSS v4, html-to-image.

---

### Task 1: Stadiums Section

**Files:**
- Create: `frontend/src/pages/StadiumsPage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/Sidebar.tsx`
- Modify: `frontend/src/components/BottomNav.tsx`

**Step 1: Write the failing test**
Create a basic component test or verify that navigating to `/stadiums` fails/does not render.

**Step 2: Run test to verify it fails**
Run: `npm run test`

**Step 3: Write minimal implementation**
1. Create `frontend/src/pages/StadiumsPage.tsx` with details of all 16 official host stadiums:
   - Capacity, location (City, Country), matches hosted, and a styled stadium card mockup using Tailwind gradients.
2. In `frontend/src/App.tsx`, import `StadiumsPage` and register route:
   `<Route path="/stadiums" element={<ProtectedRoute><StadiumsPage /></ProtectedRoute>} />`
3. In `frontend/src/components/Sidebar.tsx` and `frontend/src/components/BottomNav.tsx`, add links to `/stadiums` labeled as "Estadios 🏟️".

**Step 4: Run test to verify it passes**
Run: `npx tsc --noEmit`

**Step 5: Commit**
```bash
git add frontend/src/pages/StadiumsPage.tsx frontend/src/App.tsx frontend/src/components/Sidebar.tsx frontend/src/components/BottomNav.tsx
git commit -m "feat: add stadiums page and navigation links"
```

---

### Task 2: Group Wall Backend API & DB Initialization

**Files:**
- Modify: `backend/src/index.ts`
- Modify: `backend/src/routes/groups.ts`

**Step 1: Write database check**
We will verify if the `group_messages` table exists in Supabase.

**Step 2: Add table initialization on server startup**
Modify `backend/src/index.ts` to execute table creation on boot:
```typescript
db.query(`
  CREATE TABLE IF NOT EXISTS group_messages (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`).then(() => {
  console.log('Database initialized successfully')
}).catch((err) => {
  console.error('Failed to initialize database:', err)
})
```

**Step 3: Implement route handlers in `backend/src/routes/groups.ts`**
Add post and fetch routes:
```typescript
groupsRouter.post('/:id/messages', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const groupId = c.req.param('id')
  const { message } = await c.req.json()

  if (!message?.trim()) return c.json({ error: 'Message is required' }, 400)

  // Verify group member
  const member = await db.query(
    'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
    [groupId, userId]
  )
  if (!member.rows[0]) return c.json({ error: 'No eres miembro de este grupo' }, 403)

  const user = await db.query('SELECT username FROM users WHERE id = $1', [userId])
  const username = user.rows[0].username

  const result = await db.query(
    'INSERT INTO group_messages (group_id, user_id, username, message) VALUES ($1, $2, $3, $4) RETURNING *',
    [groupId, userId, username, message.trim()]
  )

  return c.json({ message: result.rows[0] }, 201)
})

groupsRouter.get('/:id/messages', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const groupId = c.req.param('id')

  const member = await db.query(
    'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
    [groupId, userId]
  )
  if (!member.rows[0]) return c.json({ error: 'No eres miembro de este grupo' }, 403)

  const result = await db.query(
    'SELECT * FROM group_messages WHERE group_id = $1 ORDER BY created_at DESC LIMIT 50',
    [groupId]
  )
  return c.json({ messages: result.rows })
})
```

**Step 4: Verify Compilation**
Run: `npm run build` inside `backend`

**Step 5: Commit**
```bash
git add backend/src/index.ts backend/src/routes/groups.ts
git commit -m "feat: add group messages table and endpoints"
```

---

### Task 3: Group Private Wall UI

**Files:**
- Modify: `frontend/src/pages/GroupLeaderboardPage.tsx`

**Step 1: Design Wall interface**
Add a comment wall card showing user comments, an input text-box, and a button to submit new messages.

**Step 2: Add API calls to fetch and post messages**
Integrate state for `messages` and fetch on mount or intervals inside `GroupLeaderboardPage.tsx`.

**Step 3: Run test**
Ensure typecheck passes: `npx tsc --noEmit`

**Step 4: Commit**
```bash
git add frontend/src/pages/GroupLeaderboardPage.tsx
git commit -m "feat: integrate private group messages board UI"
```

---

### Task 4: Head-to-Head Comparison

**Files:**
- Modify: `backend/src/routes/predictions.ts`
- Create: `frontend/src/pages/ComparePage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/pages/GroupLeaderboardPage.tsx`

**Step 1: Implement fetch predictions by username**
Add to `backend/src/routes/predictions.ts`:
```typescript
predictionsRouter.get('/user/:username', authMiddleware, async (c) => {
  const username = c.req.param('username')
  const userRes = await db.query('SELECT id FROM users WHERE username = $1', [username])
  if (!userRes.rows[0]) return c.json({ error: 'User not found' }, 404)
  
  const targetUserId = userRes.rows[0].id
  const result = await db.query(
    `SELECT p.*, m.home_team, m.away_team, m.match_date, m.stage, m.home_score, m.away_score
     FROM predictions p
     JOIN matches m ON p.match_id = m.id
     WHERE p.user_id = $1`,
    [targetUserId]
  )
  const bracketResult = await db.query(
    'SELECT round, team FROM bracket_predictions WHERE user_id = $1',
    [targetUserId]
  )
  return c.json({ predictions: result.rows, bracket: bracketResult.rows })
})
```

**Step 2: Create `ComparePage.tsx`**
Render a side-by-side comparison matrix of match predictions and points for the logged-in user vs the compared user.

**Step 3: Register route and link it**
- Route in `App.tsx`: `/compare/:username`
- In `GroupLeaderboardPage.tsx`, make leaderboard rows clickable to navigate to `/compare/:username`.

**Step 4: Commit**
```bash
git add backend/src/routes/predictions.ts frontend/src/pages/ComparePage.tsx frontend/src/App.tsx frontend/src/pages/GroupLeaderboardPage.tsx
git commit -m "feat: implement Head-to-Head predictions comparison"
```

---

### Task 5: Export Playoff Bracket as Image

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/src/pages/BracketPage.tsx`

**Step 1: Install `html-to-image` dependency**
Run: `npm install html-to-image` inside `frontend`.

**Step 2: Add export action to `BracketPage.tsx`**
Write a screenshot routine using `toPng` from `html-to-image` targeting the bracket grid container (`#bracket-grid`). Add a download button labeled "Descargar Bracket 📸".

**Step 3: Verify and compile**
Run: `npx tsc --noEmit` and check tests.

**Step 4: Commit**
```bash
git add frontend/package.json frontend/src/pages/BracketPage.tsx
git commit -m "feat: support exporting tournament bracket as image"
```

---

### Task 6: Global Insights & Stats

**Files:**
- Create: `frontend/src/pages/StatsPage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/Sidebar.tsx`
- Modify: `frontend/src/components/BottomNav.tsx`

**Step 1: Create Stats page**
1. Read prediction details from standard endpoints or calculate aggregation client-side (e.g., compile champion votes and popular match predictions).
2. Render statistics dashboard with percentage gauges, bars, and Outfit/Barlow styling.
3. Link the route in `App.tsx` and navbar sidebar files.

**Step 2: Commit**
```bash
git add frontend/src/pages/StatsPage.tsx frontend/src/App.tsx frontend/src/components/Sidebar.tsx frontend/src/components/BottomNav.tsx
git commit -m "feat: implement community prediction insights dashboard"
```
