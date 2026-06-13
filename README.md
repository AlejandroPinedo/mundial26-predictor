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
| **Match prediction (ML)** | Per-match forecast (Poisson + Dixon-Coles) on each card: 1X2 bar, top-3 scorelines, xG, and a comparison vs your pick — inputs update live as results land |
| **Leaderboard** | Global ranking with 30s auto-refresh and top-3 podium |
| **Private groups** | Invite-code leagues with their own leaderboard and group chat |
| **Head-to-head** | Side-by-side prediction comparison between two players |
| **Stats** | Community insights dashboard (popular picks, hot matches) |
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

## Match prediction model (ML)

Each match card shows an ML forecast: 1X2 probabilities, the three most likely scorelines, and
expected goals (xG). A **Poisson regression on goals with a Dixon-Coles low-score correction** is
trained offline in Python on ~45k historical international matches (eloratings.net-style Elo +
home advantage as features) and exported to a small `model.json` that the frontend evaluates in
pure TypeScript — **no ML dependencies in the bundle**. Inputs update live: team Elo is recomputed
from the results already played, so forecasts react as the tournament unfolds.

On a temporal holdout it beats the simulator's Elo+Poisson baseline (log-loss 0.876 vs 0.916,
60.2% vs 59.2% accuracy). Training pipeline and how to regenerate the model: [`ml/`](ml/README.md).

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
