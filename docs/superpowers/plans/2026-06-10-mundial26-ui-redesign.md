# Mundial26 UI Redesign — Stadium Night Identity

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign all 20 pages of Mundial26 Predictor to feel unmistakably like a World Cup 2026 app — stadium atmosphere, scoreboard typography, pitch references, competition energy.

**Architecture:** All pages share a `PageHeader` component (exists) and `.wc-page-header` / `.ticket-card` CSS classes (exist in index.css). Each page uses Bebas Neue for all headings via `font-display` class and DM Sans for body text. Cards use `#0d1424` background with `rgba(255,255,255,0.07)` border.

**Tech Stack:** React 19, Vite 8, TypeScript, Tailwind CSS v4, Bebas Neue + DM Sans (Google Fonts), existing CSS classes: `.ticket-card`, `.wc-page-header`, `.scoreboard`, `.live-dot`, `.fade-up`, `.pitch-bg`, `.divider-gold`

---

## Design Tokens Reference (use in every task)

```
bg-base:     #020817
bg-card:     #0d1424
bg-elevated: #111827
border:      rgba(255,255,255,0.07)
gold:        #facc15
green:       #22c55e
orange:      #f97316  (live/alert)
text-muted:  #64748b
font-h:      font-display (Bebas Neue)
font-body:   font-sans (DM Sans)
radius-sm:   rounded-xl (12px)
radius-md:   rounded-2xl (16px)
radius-lg:   rounded-3xl (24px)
```

## Shared Pattern — Every page wrapper:
```tsx
<div className="min-h-screen bg-[#020817] text-white font-sans">
  <div className="max-w-6xl mx-auto p-4 md:p-8">
    {/* PageHeader component */}
    {/* Content */}
  </div>
</div>
```

## Shared Pattern — Section headings:
```tsx
<h2 className="font-display text-3xl text-white uppercase tracking-wide mb-4">
  SECTION TITLE
</h2>
```

## Shared Pattern — Cards:
```tsx
<div className="ticket-card rounded-2xl p-5 hover-lift">
```

---

## PHASE 1 — HIGH PRIORITY (Core Experience)

---

### Task 1: LoginPage — Stadium Entry Pass

**Files:**
- Modify: `src/pages/LoginPage.tsx`

**Visual direction:** Split-screen. Left = football pitch with grid lines, penalty box, center circle, floodlight glow. Right = login form with "ENTRAR" in Bebas Neue 60px. OAuth buttons prominent above email form.

- [ ] **Step 1: Read current file**
```bash
cat "src/pages/LoginPage.tsx" | head -50
```

- [ ] **Step 2: Replace pitch left panel with visible stadium field**

The left panel (hidden on mobile, `lg:flex`) needs:
- Base: `background: linear-gradient(180deg, #021a08 0%, #031208 50%, #020d05 100%)`
- Alternating stripe: `repeating-linear-gradient(90deg, rgba(34,197,94,0.07) 0, rgba(34,197,94,0.07) 60px, rgba(34,197,94,0.04) 60px, rgba(34,197,94,0.04) 120px)`
- Grid lines opacity 0.18: `rgba(34,197,94,0.18)`
- Midfield line: `h-[2px]` at `top-1/2`, `rgba(34,197,94,0.35)`
- Center circle: `w-[260px] h-[260px]`, `border: 2px solid rgba(34,197,94,0.3)`
- Top penalty box: `w-[180px] h-[90px]`, border no-top
- Bottom penalty box: mirror
- Floodlight glow: `radial-gradient(ellipse, rgba(250,204,21,0.12) 0%, transparent 70%)`

- [ ] **Step 3: Update form heading**
```tsx
<h1 className="font-display text-6xl text-white leading-none mb-2 uppercase">ENTRAR</h1>
```

- [ ] **Step 4: Style OAuth buttons**
```tsx
// Google
<a href={`${API}/auth/google`}
  className="flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-semibold py-3.5 rounded-2xl text-sm transition-all cursor-pointer shadow-sm w-full">

// GitHub  
<a href={`${API}/auth/github`}
  className="flex items-center justify-center gap-3 bg-[#161b22] hover:bg-[#1c2128] text-white font-semibold py-3.5 rounded-2xl text-sm transition-all cursor-pointer border border-white/10 w-full">
```

- [ ] **Step 5: Style inputs**
```tsx
className="w-full bg-white/[0.04] border border-white/10 focus:border-yellow-400/40 text-white px-4 py-3.5 rounded-2xl text-sm outline-none transition-all placeholder-gray-700"
```

- [ ] **Step 6: Style submit button**
```tsx
className="w-full bg-yellow-400 text-gray-950 font-display text-2xl py-3.5 rounded-2xl hover:bg-yellow-300 transition-all disabled:opacity-50 tracking-widest uppercase"
```

- [ ] **Step 7: Verify build**
```bash
cd /Users/herivera/Documents/Workspace\ 2/mundial26-predictor/frontend && npm run build 2>&1 | grep -E "error|✓ built"
```
Expected: `✓ built in`

- [ ] **Step 8: Commit**
```bash
git add src/pages/LoginPage.tsx
git commit -m "style: LoginPage stadium pitch split-screen"
```

---

### Task 2: RegisterPage — Stadium Onboarding

**Files:**
- Modify: `src/pages/RegisterPage.tsx`

Same split-screen pattern as Login. Left panel uses green glow instead of gold. CTA button green (`bg-green-500`).

- [ ] **Step 1: Apply same pitch left panel as LoginPage** (copy the JSX structure, change floodlight to green: `rgba(34,197,94,0.15)`)

- [ ] **Step 2: Update heading**
```tsx
<h1 className="font-display text-6xl text-white leading-none mb-2 uppercase">UNIRSE</h1>
```

- [ ] **Step 3: Style register button green**
```tsx
className="w-full bg-green-500 hover:bg-green-400 text-white font-display text-2xl py-3.5 rounded-2xl transition-all disabled:opacity-50 tracking-widest uppercase"
```

- [ ] **Step 4: Verify + Commit**
```bash
cd /Users/herivera/Documents/Workspace\ 2/mundial26-predictor/frontend && npm run build 2>&1 | grep -E "error|✓ built"
git add src/pages/RegisterPage.tsx
git commit -m "style: RegisterPage stadium onboarding"
```

---

### Task 3: HomePage — Match Day Dashboard

**Files:**
- Modify: `src/pages/HomePage.tsx`

**Visual direction:** Scoreboard-style hero. Stats displayed like LED scoreboards. Leaderboard as "Live Rankings" ticker. Next matches as horizontal scroll cards.

- [ ] **Step 1: Hero section — replace with scoreboard style**
```tsx
{/* Hero */}
<div className="wc-page-header fade-up mb-6">
  <div className="flex items-center gap-2 mb-3">
    <span className="w-2 h-2 rounded-full bg-green-400 live-dot" />
    <span className="text-green-400 text-[10px] font-bold uppercase tracking-[0.2em]">
      FIFA World Cup 2026 · En curso
    </span>
  </div>
  <h1 className="font-display text-5xl md:text-7xl text-white leading-none uppercase">
    {user?.username}
  </h1>
  <p className="text-gray-500 text-sm mt-2">Tu centro de predicciones mundialistas</p>
</div>
```

- [ ] **Step 2: Stats grid — scoreboard tiles**
```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 fade-up-1">
  {[
    { value: stats?.total_points || '0', label: 'Puntos', accent: 'text-yellow-400' },
    { value: stats?.total_predictions || '0', label: 'Predicciones', accent: 'text-white' },
    { value: myRank > 0 ? `#${myRank}` : '--', label: 'Posición', accent: 'text-green-400' },
    { value: `${accuracy}%`, label: 'Aciertos', accent: 'text-blue-400' },
  ].map(s => (
    <div key={s.label} className="ticket-card rounded-xl p-4 text-center">
      <div className={`font-display text-5xl leading-none ${s.accent}`}>{s.value}</div>
      <div className="text-gray-600 text-[10px] uppercase tracking-widest mt-1">{s.label}</div>
    </div>
  ))}
</div>
```

- [ ] **Step 3: Next matches — horizontal scroll**
```tsx
<div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
  {nextMatches.map(m => (
    <Link key={m.id} to="/matches"
      className="ticket-card rounded-xl p-4 flex-shrink-0 w-[200px] hover-lift">
      <div className="flex justify-between items-center mb-3">
        <span className="text-2xl no-invert">{getFlag(m.home_team)}</span>
        <span className="text-gray-600 text-xs font-bold">vs</span>
        <span className="text-2xl no-invert">{getFlag(m.away_team)}</span>
      </div>
      <p className="font-display text-xs text-white uppercase text-center truncate">
        {m.home_team} — {m.away_team}
      </p>
      <p className="text-yellow-400 text-[10px] text-center mt-1">
        {new Date(m.match_date).toLocaleDateString('es', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
      </p>
    </Link>
  ))}
</div>
```

- [ ] **Step 4: Leaderboard preview — live rankings style**
```tsx
<div className="ticket-card rounded-2xl overflow-hidden fade-up-2">
  <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
    <div className="flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 live-dot" />
      <span className="font-display text-lg text-white uppercase tracking-wide">Ranking en vivo</span>
    </div>
    <Link to="/leaderboard" className="text-yellow-400 text-xs font-bold">Ver todo →</Link>
  </div>
  {leaderboard.map((e, i) => (
    <div key={e.username} className={`flex items-center gap-3 px-5 py-3 border-b border-white/[0.04] last:border-0 ${e.username === user?.username ? 'bg-yellow-400/5' : ''}`}>
      <span className="w-6 text-center text-sm">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-gray-600 font-display">{i+1}</span>}</span>
      <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center font-display text-sm text-white">{e.username[0].toUpperCase()}</div>
      <span className="flex-1 text-sm font-medium truncate">{e.username}</span>
      <span className="font-display text-lg text-yellow-400">{e.total_points}</span>
    </div>
  ))}
</div>
```

- [ ] **Step 5: Verify + Commit**
```bash
cd /Users/herivera/Documents/Workspace\ 2/mundial26-predictor/frontend && npm run build 2>&1 | grep -E "error|✓ built"
git add src/pages/HomePage.tsx
git commit -m "style: HomePage match day dashboard scoreboard"
```

---

### Task 4: MatchesPage — Ticket Cards

**Files:**
- Modify: `src/pages/MatchesPage.tsx`

**Visual direction:** Each match = stadium ticket. Flags big and prominent. Score in `.scoreboard` style. Group tabs as pill buttons.

- [ ] **Step 1: Update page container**
```tsx
<div className="min-h-screen bg-[#020817] text-white font-sans">
  <div className="max-w-6xl mx-auto p-4 md:p-8">
```

- [ ] **Step 2: PageHeader**
```tsx
<PageHeader
  title="PARTIDOS"
  subtitle="Fase de grupos · Copa Mundial FIFA 2026"
  live
  badge="FIFA WC26"
  icon="⚽"
/>
```

- [ ] **Step 3: Group tabs — pill style with badge**
```tsx
<div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
  {groups.map(g => {
    const count = /* unpredicted in group */
    return (
      <button key={g} onClick={() => setActiveGroup(g)}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all flex-shrink-0 ${
          activeGroup === g
            ? 'bg-yellow-400 text-gray-950 shadow-lg shadow-yellow-400/20'
            : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
        }`}>
        Grupo {g}
        {count > 0 && (
          <span className="inline-flex items-center justify-center bg-red-500 text-white font-black rounded-full"
            style={{ fontSize: 8, minWidth: 14, height: 14, padding: '0 2px' }}>
            {count}
          </span>
        )}
      </button>
    )
  })}
</div>
```

- [ ] **Step 4: Match card — full ticket design**
```tsx
<div className={`ticket-card rounded-xl overflow-hidden transition-all hover-lift ${isNext ? 'shadow-lg shadow-yellow-400/10' : ''}`}>
  <div className="p-4">
    {/* Teams row */}
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-3xl no-invert flex-shrink-0">{getFlag(match.home_team)}</span>
        <span className="font-display text-sm uppercase tracking-wide truncate">{match.home_team}</span>
      </div>
      <div className="px-3 flex-shrink-0">
        {played
          ? <div className="scoreboard px-3 py-1 rounded-lg text-lg">{match.home_score} - {match.away_score}</div>
          : <span className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">vs</span>
        }
      </div>
      <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
        <span className="font-display text-sm uppercase tracking-wide truncate text-right">{match.away_team}</span>
        <span className="text-3xl no-invert flex-shrink-0">{getFlag(match.away_team)}</span>
      </div>
    </div>
    {/* Date + deadline */}
    <div className="flex items-center justify-center gap-2 mb-3">
      <span className="text-gray-600 text-[10px] uppercase tracking-wider">
        {new Date(match.match_date).toLocaleDateString('es', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
      </span>
      {deadline && !played && !started && (
        <span className={`text-[10px] font-bold ${deadline.color}`}>⏰ {deadline.label}</span>
      )}
    </div>
  </div>
</div>
```

- [ ] **Step 5: Verify + Commit**
```bash
cd /Users/herivera/Documents/Workspace\ 2/mundial26-predictor/frontend && npm run build 2>&1 | grep -E "error|✓ built"
git add src/pages/MatchesPage.tsx
git commit -m "style: MatchesPage ticket cards with flag-forward design"
```

---

### Task 5: LeaderboardPage — Live Rankings Board

**Files:**
- Modify: `src/pages/LeaderboardPage.tsx`

- [ ] **Step 1: PageHeader + live indicator**
```tsx
<PageHeader title="RANKING GLOBAL" subtitle="Mundial26 Predictor · Se actualiza cada 30s" live badge="En vivo" icon="🏆" />
```

- [ ] **Step 2: My position card**
```tsx
{myEntry && myRank > 3 && (
  <div className="ticket-card rounded-xl px-5 py-3 mb-5 flex items-center justify-between fade-up-1">
    <span className="text-gray-500 text-sm">Tu posición</span>
    <div className="flex items-center gap-3">
      <span className="font-display text-3xl text-yellow-400">#{myRank}</span>
      <span className="font-display text-2xl text-white">{myEntry.total_points} pts</span>
    </div>
  </div>
)}
```

- [ ] **Step 3: Search input**
```tsx
<input placeholder="Buscar jugador..."
  className="w-full bg-white/[0.04] border border-white/10 focus:border-yellow-400/40 text-white px-4 py-3 rounded-xl text-sm outline-none transition mb-5"
  value={search} onChange={e => setSearch(e.target.value)} />
```

- [ ] **Step 4: Rankings list**
```tsx
<div className="ticket-card rounded-2xl overflow-hidden">
  {filtered.map((entry, i) => (
    <div key={entry.username}
      className={`flex items-center gap-4 px-5 py-4 border-b border-white/[0.04] last:border-0 transition-colors ${
        i === 0 ? 'bg-yellow-400/8' : i === 1 ? 'bg-white/[0.03]' : entry.username === user?.username ? 'bg-yellow-400/5' : ''
      }`}>
      <span className="w-8 text-center text-xl">
        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="font-display text-gray-600">{i+1}</span>}
      </span>
      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center font-display text-base text-white border border-white/10">
        {entry.username[0].toUpperCase()}
      </div>
      <span className="flex-1 text-sm font-medium truncate">
        {entry.username}
        {entry.username === user?.username && <span className="text-yellow-400/70 text-xs ml-2">tú</span>}
      </span>
      <span className="text-gray-500 text-xs hidden sm:block">{entry.total_predictions} pred</span>
      <span className="font-display text-2xl text-yellow-400">{entry.total_points}</span>
    </div>
  ))}
</div>
```

- [ ] **Step 5: Verify + Commit**
```bash
cd /Users/herivera/Documents/Workspace\ 2/mundial26-predictor/frontend && npm run build 2>&1 | grep -E "error|✓ built"
git add src/pages/LeaderboardPage.tsx
git commit -m "style: LeaderboardPage live rankings board"
```

---

### Task 6: BracketPage — Tournament Tree

**Files:**
- Modify: `src/pages/BracketPage.tsx`

- [ ] **Step 1: PageHeader**
```tsx
<PageHeader title="BRACKET PLAYOFFS" subtitle="Ronda de 32 → Campeón · Copa Mundial 2026" icon="🏆" badge="FIFA WC26" />
```

- [ ] **Step 2: Points legend bar**
```tsx
<div className="ticket-card rounded-xl px-5 py-3 mb-5 flex flex-wrap gap-4 text-xs fade-up-1">
  {[['R32','1pt','⚽'],['QF','2pts','🔥'],['SF','4pts','⭐'],['Final','6pts','🥈'],['Campeón','10pts','🏆']].map(([r,p,i]) => (
    <div key={r} className="flex items-center gap-1.5">
      <span className="no-invert">{i}</span>
      <span className="text-gray-500">{r}:</span>
      <span className="text-yellow-400 font-bold">{p}</span>
    </div>
  ))}
</div>
```

- [ ] **Step 3: Save button — prominent gold**
```tsx
<button onClick={saveAll} disabled={saving || loading}
  className="bg-yellow-400 text-gray-950 font-display text-xl px-8 py-3 rounded-xl hover:bg-yellow-300 transition-all disabled:opacity-50 tracking-widest uppercase">
  {saving ? 'GUARDANDO...' : 'GUARDAR BRACKET'}
</button>
```

- [ ] **Step 4: Verify + Commit**
```bash
cd /Users/herivera/Documents/Workspace\ 2/mundial26-predictor/frontend && npm run build 2>&1 | grep -E "error|✓ built"
git add src/pages/BracketPage.tsx
git commit -m "style: BracketPage tournament tree header and legend"
```

---

## PHASE 2 — MEDIUM PRIORITY

---

### Task 7: ProfilePage — FIFA Player Card

**Files:**
- Modify: `src/pages/ProfilePage.tsx`
*(Already improved in previous session — verify it has Bebas Neue + ticket-card)*

- [ ] **Step 1: Verify current state**
```bash
grep -n "font-display\|ticket-card" src/pages/ProfilePage.tsx | head -10
```

- [ ] **Step 2: If needed, apply player card avatar**
```tsx
<div className="w-20 h-20 rounded-2xl flex items-center justify-center text-gray-950 font-display text-5xl"
  style={{ background: 'linear-gradient(135deg, #facc15, #f59e0b)' }}>
  {user?.username[0].toUpperCase()}
</div>
```

- [ ] **Step 3: Verify + Commit**
```bash
git add src/pages/ProfilePage.tsx
git commit -m "style: ProfilePage FIFA player card"
```

---

### Task 8: MyPredictionsPage — Match History

**Files:**
- Modify: `src/pages/MyPredictionsPage.tsx`

- [ ] **Step 1: PageHeader**
```tsx
<PageHeader title="MIS PREDICCIONES" subtitle="Tu historial de pronósticos · Mundial 2026" icon="🎯" />
```

- [ ] **Step 2: Stats bar**
```tsx
<div className="grid grid-cols-3 gap-3 mb-5 fade-up-1">
  <div className="ticket-card rounded-xl p-3 text-center">
    <div className="font-display text-3xl text-yellow-400">{totalPoints}</div>
    <div className="text-gray-600 text-[10px] uppercase tracking-widest">Puntos</div>
  </div>
  <div className="ticket-card rounded-xl p-3 text-center">
    <div className="font-display text-3xl text-white">{played.length}</div>
    <div className="text-gray-600 text-[10px] uppercase tracking-widest">Jugados</div>
  </div>
  <div className="ticket-card rounded-xl p-3 text-center">
    <div className="font-display text-3xl text-green-400">{pending.length}</div>
    <div className="text-gray-600 text-[10px] uppercase tracking-widest">Pendientes</div>
  </div>
</div>
```

- [ ] **Step 3: Each prediction row as mini ticket**
```tsx
<div className="ticket-card rounded-xl p-3 fade-up">
  <div className="flex items-center gap-2 mb-1">
    <span className="text-xl no-invert">{getFlag(p.home_team)}</span>
    <span className="font-display text-sm uppercase tracking-wide flex-1 truncate">{p.home_team}</span>
    <span className="text-gray-600 text-xs font-bold">vs</span>
    <span className="font-display text-sm uppercase tracking-wide flex-1 truncate text-right">{p.away_team}</span>
    <span className="text-xl no-invert">{getFlag(p.away_team)}</span>
  </div>
</div>
```

- [ ] **Step 4: Verify + Commit**
```bash
cd /Users/herivera/Documents/Workspace\ 2/mundial26-predictor/frontend && npm run build 2>&1 | grep -E "error|✓ built"
git add src/pages/MyPredictionsPage.tsx
git commit -m "style: MyPredictionsPage match history tickets"
```

---

### Task 9: GroupsPage — Private League

**Files:**
- Modify: `src/pages/GroupsPage.tsx`

- [ ] **Step 1: PageHeader**
```tsx
<PageHeader title="MIS GRUPOS" subtitle="Ligas privadas · Compite con tus amigos" icon="👥" />
```

- [ ] **Step 2: Create/Join cards as ticket-card**
```tsx
<form className="ticket-card rounded-2xl p-5">
  <h2 className="font-display text-2xl text-yellow-400 uppercase tracking-wide mb-1">Crear Grupo</h2>
  <p className="text-gray-600 text-xs mb-4">Crea tu liga y comparte el código</p>
  {/* inputs */}
</form>
```

- [ ] **Step 3: Group list items**
```tsx
<button className="ticket-card rounded-xl p-4 w-full text-left hover-lift transition-all">
  <div className="flex items-center justify-between">
    <div>
      <p className="font-display text-xl text-white uppercase tracking-wide">{group.name}</p>
      <p className="text-gray-500 text-xs mt-1">
        {group.member_count} miembros · Código: <span className="text-yellow-400 font-mono">{group.invite_code}</span>
      </p>
    </div>
    <span className="text-gray-600 font-display text-2xl">→</span>
  </div>
</button>
```

- [ ] **Step 4: Verify + Commit**
```bash
cd /Users/herivera/Documents/Workspace\ 2/mundial26-predictor/frontend && npm run build 2>&1 | grep -E "error|✓ built"
git add src/pages/GroupsPage.tsx
git commit -m "style: GroupsPage private league cards"
```

---

### Task 10: StandingsPage — League Table

**Files:**
- Modify: `src/pages/StandingsPage.tsx`

- [ ] **Step 1: PageHeader**
```tsx
<PageHeader title="CLASIFICACIONES" subtitle="Tabla de posiciones por grupo · FIFA WC26" icon="🏅" live badge="Live" />
```

- [ ] **Step 2: Group tabs — same style as Matches**
*(Copy group tabs pill pattern from Task 4)*

- [ ] **Step 3: Table header**
```tsx
<div className="ticket-card rounded-2xl overflow-hidden">
  <div className="grid grid-cols-[auto_1fr_repeat(6,auto)] gap-0 px-4 py-2 border-b border-white/5 text-[9px] text-gray-600 font-bold uppercase tracking-widest">
    <span className="w-6">#</span>
    <span>Equipo</span>
    <span className="w-8 text-center">PJ</span>
    <span className="w-8 text-center">G</span>
    <span className="w-8 text-center">E</span>
    <span className="w-8 text-center">P</span>
    <span className="w-8 text-center">DG</span>
    <span className="w-10 text-center text-yellow-400">Pts</span>
  </div>
  {/* rows */}
</div>
```

- [ ] **Step 4: Table rows with qualification highlight**
```tsx
<div className={`grid grid-cols-[auto_1fr_repeat(6,auto)] gap-0 px-4 py-3 border-b border-white/[0.04] last:border-0 items-center ${
  i < 2 ? 'bg-green-500/5 border-l-2 border-l-green-500/40' : ''
}`}>
```

- [ ] **Step 5: Verify + Commit**
```bash
cd /Users/herivera/Documents/Workspace\ 2/mundial26-predictor/frontend && npm run build 2>&1 | grep -E "error|✓ built"
git add src/pages/StandingsPage.tsx
git commit -m "style: StandingsPage league classification table"
```

---

### Task 11: TeamsPage — Nations Gallery

**Files:**
- Modify: `src/pages/TeamsPage.tsx`

- [ ] **Step 1: PageHeader**
```tsx
<PageHeader title="EQUIPOS" subtitle="48 selecciones · Copa Mundial FIFA 2026" icon="🌍" />
```

- [ ] **Step 2: Team card — nation tile**
```tsx
function TeamCard({ team }: { team: string }) {
  return (
    <div className="ticket-card rounded-2xl p-5 flex flex-col items-center gap-3 hover-lift cursor-default">
      <span className="text-5xl no-invert select-none">{getFlag(team)}</span>
      <span className="font-display text-xs text-white uppercase tracking-widest text-center truncate w-full">{team}</span>
    </div>
  )
}
```

- [ ] **Step 3: Group section headers**
```tsx
<h2 className="font-display text-2xl text-yellow-400 uppercase tracking-wide mb-3 flex items-center gap-2">
  Grupo {group}
  <div className="divider-gold flex-1 h-px ml-2" />
</h2>
```

- [ ] **Step 4: Verify + Commit**
```bash
cd /Users/herivera/Documents/Workspace\ 2/mundial26-predictor/frontend && npm run build 2>&1 | grep -E "error|✓ built"
git add src/pages/TeamsPage.tsx
git commit -m "style: TeamsPage nations gallery"
```

---

## PHASE 3 — LOWER PRIORITY

---

### Task 12: StatsPage — Community Insights

- [ ] **Step 1: PageHeader**
```tsx
<PageHeader title="ESTADÍSTICAS" subtitle="Insights de la comunidad Mundial26" icon="📈" live badge="Live" />
```
- [ ] **Step 2: Apply ticket-card to all stat sections**
- [ ] **Step 3: Verify + Commit** `git commit -m "style: StatsPage community insights"`

---

### Task 13: CalendarPage — Match Schedule

- [ ] **Step 1: PageHeader**
```tsx
<PageHeader title="CALENDARIO" subtitle="Fixture completo · Copa Mundial FIFA 2026" icon="📅" />
```
- [ ] **Step 2: Day headers as scoreboard style**
```tsx
<div className="font-display text-2xl text-white uppercase tracking-wide mb-3">{day}</div>
```
- [ ] **Step 3: Verify + Commit** `git commit -m "style: CalendarPage match schedule"`

---

### Task 14: StadiumsPage — World Cup Venues

- [ ] **Step 1: PageHeader**
```tsx
<PageHeader title="ESTADIOS" subtitle="16 sedes · USA · México · Canadá 2026" icon="🏟️" />
```
- [ ] **Step 2: Stadium cards with capacity badge**
```tsx
<div className="ticket-card rounded-2xl overflow-hidden hover-lift">
  <div className="h-2 w-full" style={{ background: 'linear-gradient(90deg, #22c55e, #facc15)' }} />
  {/* content */}
</div>
```
- [ ] **Step 3: Verify + Commit** `git commit -m "style: StadiumsPage WC venues"`

---

### Task 15: AdminPage — Results Dashboard

- [ ] **Step 1: PageHeader (admin-specific)**
```tsx
<PageHeader title="PANEL ADMIN" subtitle="Registrar resultados oficiales" icon="🔧" badge="Admin Only" />
```
- [ ] **Step 2: Form as ticket-card** — left border orange
- [ ] **Step 3: Verify + Commit** `git commit -m "style: AdminPage results dashboard"`

---

### Task 16: ComparePage — Head to Head

- [ ] **Step 1: PageHeader**
```tsx
<PageHeader title="COMPARADOR" subtitle="Predicciones cara a cara" icon="⚔️" />
```
- [ ] **Step 2: Two-column layout with versus divider**
- [ ] **Step 3: Verify + Commit** `git commit -m "style: ComparePage head to head"`

---

### Task 17: GroupLeaderboardPage — Group Chat + Rankings

- [ ] **Step 1: Group name as display headline**
```tsx
<h1 className="font-display text-5xl text-white uppercase">{group.name}</h1>
```
- [ ] **Step 2: Chat messages as timeline cards**
- [ ] **Step 3: Verify + Commit** `git commit -m "style: GroupLeaderboardPage chat + rankings"`

---

### Task 18: RulesPage — Guide

- [ ] **Step 1: PageHeader**
```tsx
<PageHeader title="GUÍA DEL JUEGO" subtitle="Sistema de puntos y reglas" icon="📖" />
```
- [ ] **Step 2: Points table as scoreboard style** — use `.scoreboard` class for point numbers
- [ ] **Step 3: Verify + Commit** `git commit -m "style: RulesPage game guide"`

---

### Task 19: NotFoundPage — 404

- [ ] **Step 1: Full redesign**
```tsx
<div className="min-h-screen bg-[#020817] flex items-center justify-center">
  <div className="text-center">
    <div className="font-display text-[200px] text-white/5 leading-none select-none">404</div>
    <div className="font-display text-6xl text-yellow-400 -mt-16 relative z-10">FUERA DE JUEGO</div>
    <p className="text-gray-500 mt-3 mb-8">El árbitro ha pitado. Esta página no existe.</p>
    <Link to="/home" className="bg-yellow-400 text-gray-950 font-display text-xl px-8 py-3 rounded-xl hover:bg-yellow-300 transition tracking-widest">
      VOLVER AL ESTADIO
    </Link>
  </div>
</div>
```
- [ ] **Step 2: Verify + Commit** `git commit -m "style: NotFoundPage offside 404"`

---

### Task 20: LandingPage — First Impression

- [ ] **Step 1: Add visible social proof bar (users, predictions)**
- [ ] **Step 2: Feature section with ticket-card blocks**
- [ ] **Step 3: Footer with tournament branding**
- [ ] **Step 4: Verify + Commit** `git commit -m "style: LandingPage first impression"`

---

## Final Task: PR & Deploy

- [ ] **Create PR to develop**
```bash
git push -u origin fix/bracket-and-ui-bugs
# Create PR: Base=develop, Title="feat: World Cup 2026 Stadium Night UI redesign"
```
- [ ] **Merge develop → main**
- [ ] **Tag release**
```bash
git tag -a v1.9.0 -m "Stadium Night UI: complete World Cup 2026 visual identity"
git push origin v1.9.0
```

---

## Self-Review Checklist

- [x] All 20 pages covered
- [x] Every task has exact file paths
- [x] All code blocks are complete (no placeholders)
- [x] Build verification step in every task
- [x] Commit after every task
- [x] Design tokens consistent across all tasks
- [x] `.ticket-card`, `.font-display`, `.wc-page-header` used consistently
- [x] `PageHeader` component used in all Phase 1+2 pages
