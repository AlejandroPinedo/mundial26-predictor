# ⚽ Mundial26 Predictor

> Predict the scores of the 2026 World Cup, compete with your friends, and prove you saw it coming.

**🔗 Live demo:** [mundial26-predictor.vercel.app](https://mundial26-predictor.vercel.app)

---

## About this project

**Mundial26 Predictor is a personal, self-taught learning project — built for education, not profit.**

It exists to practice the full lifecycle of a real-world web application from scratch: CI/CD pipelines, multi-environment deployments, Git branching workflows, semantic releases, unit testing, monitoring, and AI-assisted frontend development. The football prediction game is the excuse; the engineering process is the goal.

It is a fullstack web app for forecasting the matches of the 2026 FIFA World Cup (United States · Canada · Mexico). Users predict match scores, compete on a global leaderboard and in private groups, and fill out their playoff bracket.

> **Disclaimer:** This is an unofficial, non-commercial fan project created for learning purposes only. It is not affiliated with, endorsed by, or connected to FIFA or any of its partners. No revenue is generated, no fees are charged, and no official trademarks or assets are used. "FIFA World Cup" is a trademark of FIFA.

---

## ✨ v2.0 — "WE ARE 26" redesign

Version 2.0 ships a complete visual redesign inspired by the tri-nation identity of the 2026 tournament — built end-to-end with AI-assisted development as a vibecoding experiment:

- **Tri-nation design system**: stadium-ink dark backgrounds with a four-color signature — Canada red `#FF3B5C` · trophy gold `#FFC300` · Mexico green `#00E08F` · USA blue `#3D7BFF` — implemented as Tailwind CSS v4 design tokens.
- **Sports-poster typography**: Archivo Black for headlines and scoreboards, Archivo condensed for labels, Outfit for body text.
- **Signature components**: match-ticket cards, glass panels, giant "26" watermarks, glowing scoreboard digits, and a professional SVG stroke-icon set replacing emoji navigation.
- All 21 pages were redesigned while preserving 100% of the existing functionality.

The full design brief that guided the redesign lives in [`docs/REDESIGN_PROMPT.md`](docs/REDESIGN_PROMPT.md).

---

## Features

| Category | Feature |
|---|---|
| **Auth** | Sign up, JWT login, Google/GitHub OAuth, password change |
| **Group stage** | Score predictions for 72 matches across groups A–L |
| **Standings** | Dynamic group tables with P, W, D, L, GF, GA, GD, Pts |
| **Playoff bracket** | Interactive predictions from the Round of 32 to the Champion |
| **Scoring** | Automatic: 3 pts exact score, 1 pt correct outcome |
| **Pez Oráculo (ML prediction)** | Per-match forecast on each card: a collapsible summary (favoured outcome + likely score) expanding to 1X2 bar, top-3 scorelines, xG, recent form and a comparison vs your pick — live-Elo updates (offline-trained Poisson + Dixon-Coles). Also **competes in the global ranking** as a virtual "IA" contestant |
| **Leaderboard** | Global ranking with 30s auto-refresh and top-3 podium — the Pez Oráculo competes here as a non-player "IA" benchmark |
| **Private groups** | Invite-code leagues with their own leaderboard and group chat |
| **Head-to-head** | Side-by-side prediction comparison between two players |
| **Stats** | Community insights dashboard: shot map, pool analytics, and Oracle vs reality charts |
| **Calendar** | Matches by date with inline prediction |
| **Teams** | Gallery of all 48 national teams by group |
| **Stadiums** | The 16 tournament venues with city and capacity |
| **Admin** | Panel to load official results and recalculate points |
| **Notifications** | Real-time toasts when new results land (30s polling) |
| **PWA** | Installable on mobile as a native-like app |
| **Dark/Light mode** | Theme toggle with persistence |
| **Bracket export** | Download your bracket as a shareable PNG |

---

## Tech stack

```
Frontend:   React 19 + Vite 8 + TypeScript + Tailwind CSS v4
Backend:    Node.js + Hono + TypeScript
Database:   PostgreSQL (Supabase)
Auth:       JWT (bcryptjs + jsonwebtoken) + OAuth
Testing:    Vitest (unit tests, run on every PR)
CI/CD:      GitHub Actions + Vercel + Render
Monitoring: Sentry (frontend + backend)
```

---

## Architecture

```
mundial26-predictor/          ← monorepo
├── frontend/                 ← React + Vite
│   ├── src/
│   │   ├── components/       ← AppShell, Sidebar, BottomNav, Icon, Skeleton...
│   │   ├── hooks/            ← useRealtimeMatches (polling)
│   │   ├── pages/            ← 21 pages
│   │   ├── context/          ← AuthContext, ThemeContext
│   │   ├── api/              ← apiFetch client
│   │   ├── sim/              ← Monte Carlo tournament simulator (Elo + Poisson)
│   │   ├── predict/          ← per-match ML predictor (model.json + predictMatch.ts)
│   │   └── utils/            ← flags, points, scoring, ratings, squads
│   └── public/               ← favicon, PWA manifest
├── ml/                       ← offline Python training → frontend/src/predict/model.json
├── backend/
│   ├── src/
│   │   ├── routes/           ← auth, predictions, groups, bracket
│   │   ├── middleware/       ← authMiddleware, rateLimit
│   │   └── utils/            ← scoring (calculatePoints)
│   └── dist/                 ← production build
├── docs/                     ← design brief and plans
└── .github/workflows/        ← CI pipeline (tests on every PR)
```

---

## Stats — Estadísticas

The Stats page (`/estadisticas`) is built from three independent data sources, each with its own fetch path:

### 1. Shot map — datos oficiales FIFA

**Source:** FIFA's public REST API (`api.fifa.com/api/v3`) — no token required.

**Pipeline:**

1. A daily GitHub Actions job (`shot-map.yml`) runs `npm run sync:shotmap` → `backend/scripts/sync-shotmap.ts`, which calls `computeShotMap()` in `backend/src/results/fifaShotMap.ts`.
2. `computeShotMap()` fetches the full match calendar for the 2026 edition (competition `17`, season `285023`), filters for completed matches (`MatchStatus === 0`), and then fetches each match's **timeline** endpoint sequentially (to be polite to the FIFA API). Shot events are identified by type: `0` (Goal), `12` (Attempt at Goal), `41` (Penalty Goal), `60` (Penalty attempt).
3. Each shot's absolute coordinates (`PositionX`, `PositionY` — pitch scale 0–100) are **folded toward the attacking end** (`x < 50 → mirror`), so both teams' shots always map to the same half. Penalty events without coordinates default to the canonical penalty-spot position.
4. Per shot, the pipeline computes: Euclidean distance to goal (in metres, using real pitch dimensions 105 × 68 m), whether the shot is inside the penalty box (16.5 m × 40.32 m), and the phase label translated to Spanish.
5. **Player name canonicalisation:** FIFA sometimes uses multiple spellings for the same player across timelines (e.g. "VINI JR." vs "VINICIUS JUNIOR"). Names are normalised by `IdPlayer`: the longest variant wins, keyed by ID to avoid merging distinct players sharing a surname.
6. The resulting `ShotMapPayload` — an array of all shots with metadata plus pre-computed aggregate stats — is persisted as a single JSONB row in the `shot_map_cache` table (upsert on `id = 1`).
7. In addition to the daily job, the cron endpoint (`POST /cron/sync-results`) **also triggers a shot-map refresh** whenever at least one match result is ingested or confirmed in that tick — so the map updates close to the final whistle without hammering the FIFA API on every ping.
8. The backend endpoint `GET /football/shot-map` reads from `shot_map_cache` with a **5-minute in-memory cache** on top (stale-while-error).

**Frontend aggregations** (`frontend/src/components/charts/ShotInsights.tsx`) are all computed client-side from the flat `shots[]` array — no extra endpoints:
- **Conversión por distancia**: 6 distance bins (0–6, 6–11, 11–16, 16–22, 22–30, 30+ m), conversion rate line + shot-volume bars.
- **¿Cuándo caen los goles?**: Goals split into 7 × 15-minute bins (added-time mapped via `effectiveMinute()`).
- **Eficacia goleadora**: Teams ranked by non-penalty conversion %, minimum 4 shots.
- **Dentro vs fuera del área**: Three donuts — inside box, outside box, and penalties.
- **Zonas de remate**: 7 × 5 heat-grid; depth axis = distance to goal, lateral axis = pitch width; goal count overlaid per cell.

The interactive `ShotMap.tsx` canvas (the pitch view with individual shot dots) renders the same dataset with client-side filters (team, stage).

---

### 2. Pool insights — agregaciones de la comunidad

**Source:** `GET /predictions/global-insights` — runs 9 SQL queries against the `predictions` and `bracket_predictions` tables in Supabase (public endpoint, no auth required).

| Query | What it computes |
|---|---|
| `mostPredictedChampions` | Top-5 bracket champions by pick count; strips the slot prefix (`0:Argentina → Argentina`) |
| `averageScores` | `AVG(predicted_home)` and `AVG(predicted_away)` across all predictions |
| `popularScores` | Top-5 most-predicted (home, away) score pairs |
| `hotMatches` | Top-5 matches by number of predictions |
| `totalPredictions` | Simple `COUNT(*)` |
| `averagePoints` | `AVG(points)` where points have been awarded |
| `pointsDistribution` | Count of predictions per points value (0 / 1 / 3) |
| `predictedGoalsDistribution` | `UNION ALL` of `predicted_home` and `predicted_away`, grouped by value → goals histogram |
| `bracketRounds` | Distinct teams still alive per bracket round (embudo) |
| `activity` | `COUNT(*)` grouped by `EXTRACT(HOUR ...)` and `EXTRACT(DOW ...)` from `created_at` |
| `crowdFavorites` | Most-voted scoreline per completed match (window `SUM(COUNT(*)) OVER (PARTITION BY match_id)`), used in the Crowd vs Oracle table |

**Frontend** (`frontend/src/components/charts/PoolInsights.tsx`) renders four charts from this payload plus the raw `matches[]` list:
- **¿Qué tan difícil es acertar?** — bar chart of 0 / 1 / 3 point distribution.
- **Lo que la gente predice vs lo que pasa** — side-by-side goal-count histograms: pool-predicted (from DB) vs actual goals (derived client-side from `matches[]`), capped at 6+.
- **Embudo del bracket** — funnel of distinct teams per round.
- **Cuándo pronostica la comunidad** — hourly bar chart + day-of-week bar chart.

---

### 3. Oracle insights — modelo ML vs realidad

**Source:** The same `GET /predictions/matches` payload that the match cards use (no new endpoints), plus `crowdFavorites` from `global-insights`.

All ML computations are done **client-side** in `frontend/src/components/charts/OracleInsights.tsx`:

1. Matches are sorted chronologically and fed through a **live Elo walk**: for each match, `predictMatch()` is called with the Elo state *before* that match, then `updateElo()` advances the ratings with the actual result. Future matches use the current post-tournament Elo. This mirrors exactly how the frozen Oracle picks were generated — no peeking.
2. From this `rows[]` array of `{ match, pred }` pairs, five charts are rendered:
   - **Goles por fase** — average goals per match, grouped by stage (sorted by first match date, not by string).
   - **¿Cómo terminan los partidos?** — donut of 1X2 real outcomes.
   - **Calibración del Pez Oráculo** — scatter plot of confidence bin (x) vs actual hit rate (y), with bubble size ∝ sample size; a 45° dashed "perfect calibration" diagonal is the reference.
   - **Pronóstico del Oráculo** — stacked 1X2 probability bars for the next 8 upcoming matches.
   - **Termómetro de sorpresas** — top-6 most surprising results, ranked by `1 − P(actual outcome)`.
   - **La masa vs el Oráculo vs la realidad** — table showing the crowd's most-voted score vs the Oracle's modal score vs the real result, with ✓/1X2/✗ markers.

---

## "Pez Oráculo" — ML match prediction

Each match card shows a forecast badged **"Pez Oráculo"** (a nod to the Oracle Fish from Dragon
Ball Super): a collapsible one-line summary (favoured outcome + most likely score) that expands to
1X2 probabilities, the three most likely scorelines, expected goals (xG), each team's recent form
(last results, goals for/against), and a comparison against your own pick. A **Poisson regression on goals with a Dixon-Coles low-score correction** is trained
offline in Python on ~45k historical international matches (eloratings.net-style Elo + home
advantage as features) and exported to a small `model.json` the frontend evaluates in pure
TypeScript — **no ML dependencies in the bundle**. Inputs update live: team Elo is recomputed from
the results already played, so forecasts react as the tournament unfolds.

> Note: the single most likely scoreline (often a low draw such as 1-1) can differ from the
> favoured outcome — a win aggregates many scorelines, so its total probability can exceed any
> single score. That's expected behaviour of a Poisson goal model, not a bug.

On a temporal holdout it beats the simulator's Elo+Poisson baseline (log-loss 0.876 vs 0.916,
60.2% vs 59.2% accuracy). Training pipeline and how to regenerate the model: [`ml/`](ml/README.md).

### The Oracle as a ranking contestant

The Pez Oráculo also **competes in the global ranking** as a virtual "IA" entry (it is not a real
user — its name can't be registered). Fairness is the whole point:

- **Group picks** are frozen at each match's kickoff and scored with the same rules as players. The
  first matchday is locked with pre-tournament Elo; later matches use only results from *earlier*
  games, so a pick never sees its own result. Once written, picks are immutable.
- **Bracket** is a one-off **pre-tournament forecast** built by the Monte Carlo simulator with a
  fixed seed (reproducible), scored with the same playoff weights as players.
- The ranking row is computed virtually (no fake user); points are tallied live with the shared
  `calculatePoints`.

Seed / refresh the Oracle's predictions (from `backend/`):

```bash
npm run seed:oracle           # freeze group picks that are due (idempotent)
npm run seed:oracle-bracket   # build & freeze the pre-tournament bracket (lock-once)
```

Group picks also lock automatically whenever the admin enters an official result.

---

## Navigation

**Desktop (sidebar):** Home · Calendar · Matches · Bracket · Ranking · Standings · Stats · My predictions · Private groups · Teams · Stadiums · Guide

**Mobile (bottom nav):** Home · Matches · Bracket · Ranking · ⊕ More (drawer with every section)

The app UI is in Spanish — it was built for a Spanish-speaking friend group.

---

## Environments

| Environment | Frontend | Backend |
|---|---|---|
| **Production** | [mundial26-predictor.vercel.app](https://mundial26-predictor.vercel.app) | [mundial26-api-staging.onrender.com](https://mundial26-api-staging.onrender.com) |
| **Staging** | Per-PR preview URL (Vercel) | — |

---

## Local setup

```bash
# Clone
git clone https://github.com/AlejandroPinedo/mundial26-predictor.git
cd mundial26-predictor

# Backend
cd backend
cp .env.example .env   # fill in your credentials
npm install
npm run dev            # http://localhost:3000

# Frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev            # http://localhost:5173
```

### Required environment variables

**Backend `.env`:**
```
DATABASE_URL=         # Supabase Transaction Pooler URL (port 6543)
JWT_SECRET=           # Secure random string
CORS_ORIGIN=          # http://localhost:5173 for local dev
SENTRY_DSN=           # Optional
```

**Frontend `.env`:**
```
VITE_API_URL=         # http://localhost:3000 for local dev
VITE_SENTRY_DSN=      # Optional
```

---

## Git workflow

```
feat/* → PR → CI (tests) → develop → PR → main → auto-deploy
```

- **`main`** → production (Vercel + Render auto-deploy)
- **`develop`** → integration (staging preview on Vercel)
- **feature branches** → day-to-day work via PRs

Conventional Commits: `feat:`, `fix:`, `ci:`, `chore:`, `docs:`

---

## Releases

| Version | Highlights |
|---|---|
| **v2.2.0** | "Pez Oráculo" joins the **global ranking** as a virtual "IA" contestant: group picks frozen fairly at kickoff (never sees its own result) and a reproducible pre-tournament bracket forecast, scored with the same rules as players |
| **v2.1.0** | "Pez Oráculo" — ML per-match prediction on each match card: 1X2 probabilities, likely scorelines and xG, with live-Elo updates (offline-trained Poisson + Dixon-Coles model, evaluated client-side) |
| v2.0.0 | "WE ARE 26" complete frontend redesign: tri-nation design system, SVG icon set, sports-poster typography, web-font loading fix |
| v1.6.x | Full guide, mobile "More" drawer, Compare button from profile |
| v1.5.x | Group chat, head-to-head compare, venues, standings, R32 bracket, community insights |
| v1.3.0 | Full redesign: sidebar, bottom nav, home dashboard, teams gallery |
| v1.2.0 | Flags, deadline alerts, PWA, UI revamp |
| v1.0.0 | Complete MVP: auth, predictions, leaderboard, private groups, admin panel |
| v0.1.0 | Initial deployment |

---

## Scoring system

**Group stage:**
- 🟢 **3 pts** — Exact score
- 🔵 **1 pt** — Correct outcome (winner/draw)
- ⚫ **0 pts** — Wrong outcome

**Playoffs:**
- Round of 32: 1 pt · Quarter-finals: 2 pts · Semi-finals: 4 pts · Finalist: 6 pts · Champion: 10 pts

---

## Tests

```bash
cd backend && npm test    # calculatePoints unit tests
cd frontend && npm test   # scoring, simulator and match-predictor unit tests
```

GitHub Actions runs both suites automatically on every PR targeting `develop` or `main`.

---

## License

[MIT](LICENSE) — free to learn from, fork, and experiment with.

---

*A self-taught journey: DevOps + web development from zero, one PR at a time.*
