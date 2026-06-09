# ⚽ Mundial26 Predictor

> Predice los marcadores del Mundial 2026, compite con tus amigos y demuestra que la tienes clara.

**🔗 Live:** [mundial26-predictor.vercel.app](https://mundial26-predictor.vercel.app)

---

## ¿Qué es esto?

Una aplicación web fullstack para pronosticar los partidos del **FIFA World Cup 2026** (USA · Canadá · México). Los usuarios predicen marcadores, compiten en un leaderboard global y en grupos privados, y llenan su bracket de playoffs.

Construida como proyecto de aprendizaje con arquitectura y ciclo de vida profesional: CI/CD, múltiples entornos, releases semánticos y tests unitarios.

---

## Funcionalidades

| Categoría | Feature |
|---|---|
| **Auth** | Registro, login con JWT, cambio de contraseña |
| **Fase de grupos** | Predicción de marcadores para 72 partidos organizados por grupos A–L |
| **Clasificaciones** | Tabla de posiciones dinámica por grupo con PJ, G, E, P, GF, GC, DG, Pts |
| **Bracket playoffs** | Predicción interactiva desde Ronda de 32 hasta Campeón |
| **Puntuación** | Automática: 3 pts marcador exacto, 1 pt resultado correcto |
| **Leaderboard** | Ranking global con auto-refresh cada 30s y medallas top 3 |
| **Grupos privados** | Ligas con código de invitación, leaderboard propio y chat de grupo |
| **Comparador** | Comparación cara a cara de predicciones entre dos usuarios |
| **Estadísticas** | Dashboard de insights de la comunidad |
| **Calendario** | Vista de partidos por fecha con predicción integrada |
| **Equipos** | Galería de las 48 selecciones con banderas por grupo |
| **Estadios** | Los 16 recintos del torneo con ciudad y capacidad |
| **Admin** | Panel para registrar resultados y calcular puntos automáticamente |
| **Notificaciones** | Toast en tiempo real cuando se carga un nuevo resultado (polling 30s) |
| **PWA** | Instalable en móvil como app nativa |
| **Dark/Light mode** | Toggle de tema desde el sidebar |
| **Exportar bracket** | Descarga el bracket como imagen para compartir |

---

## Stack técnico

```
Frontend:   React 19 + Vite 8 + TypeScript + Tailwind CSS v4
Backend:    Node.js + Hono + TypeScript
Base datos: PostgreSQL (Supabase)
Auth:       JWT manual (bcryptjs + jsonwebtoken)
Testing:    Vitest (8 tests unitarios)
CI/CD:      GitHub Actions + Vercel + Render
Monitoring: Sentry (frontend + backend)
```

---

## Arquitectura

```
mundial26-predictor/          ← monorepo
├── frontend/                 ← React + Vite
│   ├── src/
│   │   ├── components/       ← AppShell, Sidebar, BottomNav, Skeleton...
│   │   ├── hooks/            ← useRealtimeMatches (polling)
│   │   ├── pages/            ← 20 páginas
│   │   ├── context/          ← AuthContext, ThemeContext
│   │   ├── api/              ← apiFetch client
│   │   └── utils/            ← flags, points, scoring, simulate
│   └── public/               ← favicon, manifest PWA
├── backend/
│   ├── src/
│   │   ├── routes/           ← auth, predictions, groups, bracket
│   │   ├── middleware/        ← authMiddleware, rateLimit
│   │   └── utils/            ← scoring (calculatePoints)
│   └── dist/                 ← build de producción
└── .github/workflows/        ← CI pipeline (tests en cada PR)
```

---

## Navegación

**Desktop (Sidebar):** Inicio · Calendario · Partidos · Bracket · Ranking · Clasificaciones · Estadísticas · Mis predicciones · Grupos · Equipos · Estadios · Guía

**Móvil (Bottom Nav):** Inicio · Partidos · Bracket · Ranking · ⊕ Más (drawer con todas las secciones)

---

## Entornos

| Entorno | Frontend | Backend |
|---|---|---|
| **Production** | [mundial26-predictor.vercel.app](https://mundial26-predictor.vercel.app) | [mundial26-api-staging.onrender.com](https://mundial26-api-staging.onrender.com) |
| **Staging** | Preview URL por PR (Vercel) | — |

---

## Setup local

```bash
# Clonar
git clone https://github.com/AlejandroPinedo/mundial26-predictor.git
cd mundial26-predictor

# Backend
cd backend
cp .env.example .env   # completar con tus credenciales
npm install
npm run dev            # http://localhost:3000

# Frontend (nueva terminal)
cd frontend
cp .env.example .env
npm install
npm run dev            # http://localhost:5173
```

### Variables de entorno requeridas

**Backend `.env`:**
```
DATABASE_URL=         # Supabase Transaction Pooler URL (puerto 6543)
JWT_SECRET=           # String aleatorio seguro
CORS_ORIGIN=          # http://localhost:5173 en local
SENTRY_DSN=           # Opcional
```

**Frontend `.env`:**
```
VITE_API_URL=         # http://localhost:3000 en local
VITE_SENTRY_DSN=      # Opcional
```

---

## Flujo de trabajo Git

```
feat/* → PR → CI (tests) → develop → PR → main → deploy automático
```

- **`main`** → producción (Vercel + Render auto-deploy)
- **`develop`** → integración (staging preview en Vercel)
- **feature branches** → trabajo diario con PRs

Conventional Commits: `feat:`, `fix:`, `ci:`, `chore:`, `docs:`

---

## Releases

| Versión | Highlights |
|---|---|
| v1.6.x | Guía completa, drawer "Más" en móvil, botón Comparar desde perfil |
| v1.5.x | Chat de grupo, comparador, sedes, standings, bracket R32, insights comunidad |
| v1.3.0 | Rediseño completo: sidebar, bottom nav, home dashboard, galería equipos |
| v1.2.0 | Banderas, alertas deadline, PWA, UI revamp |
| v1.0.0 | MVP completo: auth, predicciones, leaderboard, grupos privados, admin panel |
| v0.1.0 | Initial deployment |

---

## Sistema de puntos

**Fase de grupos:**
- 🟢 **3 pts** — Marcador exacto
- 🔵 **1 pt** — Resultado correcto (ganador/empate acertado)
- ⚫ **0 pts** — Resultado incorrecto

**Playoffs:**
- Ronda de 32: 1 pt · Cuartos: 2 pts · Semifinal: 4 pts · Finalista: 6 pts · Campeón: 10 pts

---

## Tests

```bash
cd backend && npm test    # 5 tests (calculatePoints)
cd frontend && npm test   # 3 tests (getPointsBadge)
```

El CI en GitHub Actions corre los tests automáticamente en cada PR.

---

*Proyecto de aprendizaje — DevOps + Web Development desde cero.*
