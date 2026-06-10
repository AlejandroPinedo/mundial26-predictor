# PROMPT MAESTRO — Rediseño Frontend "WE ARE 26"

> Este documento es el prompt de diseño que guía el rediseño completo del frontend.
> Cualquier agente que rediseñe una página DEBE leer este documento completo antes de tocar código.

## 1. Objetivo

Rediseñar **completamente** la capa visual del frontend de Mundial26 Predictor con una identidad
inspirada en la Copa Mundial FIFA 2026 (Canadá–México–Estados Unidos), **sin romper ninguna
funcionalidad existente**. Cambia el markup (JSX) y las clases todo lo que quieras; la lógica es intocable.

## 2. Concepto visual: "WE ARE 26 — Tri-Nation Broadcast"

La identidad del Mundial 2026 es **bold, geométrica y tricolor**: tres naciones anfitrionas, números
gigantes, energía de transmisión deportiva en horario estelar. El rediseño se basa en:

- **Fondo "tinta de estadio de noche"**: negro-violeta profundo, no azul marino.
- **Firma tricolor**: rojo (Canadá) → dorado (trofeo) → verde (México) → azul (EE.UU.) como
  gradiente lineal en franjas finas (`.tri-stripe`), bordes superiores de tarjetas y acentos.
- **Números gigantes**: marcadores y "26" como elemento gráfico de fondo (`.wm-26`, watermark).
- **Tarjetas tipo ticket de partido**: borde perforado, franja tricolor, look de entrada al estadio.
- **Paneles glass**: superficies translúcidas con blur sutil sobre la tinta.
- **Tipografía de póster deportivo**: Archivo Black para titulares y números, Archivo condensada
  para etiquetas, Outfit para texto.

## 3. Sistema de diseño (ya implementado en `frontend/src/index.css`)

### Tokens de color (Tailwind v4 `@theme` → genera utilidades)

| Token | Valor | Utilidades | Uso |
|---|---|---|---|
| `ink-950` | `#07060E` | `bg-ink-950` | Fondo global |
| `ink-900` | `#0C0A16` | `bg-ink-900` | Fondos secundarios |
| `panel` | `#110E1E` | `bg-panel` | Tarjetas |
| `panel-2` | `#18142A` | `bg-panel-2` | Tarjetas elevadas / hover |
| `ca` | `#FF3B5C` | `text-ca`, `bg-ca/10`… | Rojo Canadá: errores, live, eliminación |
| `mx` | `#00E08F` | `text-mx`, `border-mx/30`… | Verde México: éxito, activo, en juego |
| `us` | `#3D7BFF` | `text-us`, `bg-us/10`… | Azul EE.UU.: info, enlaces, fase de grupos |
| `gold` | `#FFC300` | `text-gold`, `bg-gold`… | Dorado trofeo: puntos, CTA primario, campeón |

Bordes/lineas: `border-white/8` por defecto, `border-gold/25` para destacar.
Texto: blanco para titulares, `text-gray-400` cuerpo, `text-gray-500/600` secundario (la paleta gray de Tailwind sigue disponible).

### Tipografías

- `font-display` → **Archivo Black**: titulares, marcadores, números grandes. SIEMPRE en `uppercase`.
- `font-condensed` (alias `font-barlow`) → **Archivo** (700–900): etiquetas, badges, nav, subtítulos cortos. `uppercase tracking-wide`.
- `font-sans` → **Outfit**: cuerpo de texto, párrafos, formularios.

### Clases utilitarias del sistema (definidas en index.css)

- `.tri-stripe` — franja de 3px con gradiente tricolor (encabezados, top de tarjetas).
- `.tri-text` — texto con gradiente tricolor (solo para 1 palabra clave por página, máximo).
- `.ticket-card` — tarjeta tipo ticket: panel oscuro, franja tricolor izquierda, esquinas perforadas.
- `.glass` — panel translúcido con blur.
- `.wc-page-header` — encabezado de página (lo usa `PageHeader.tsx`, no lo dupliques a mano).
- `.scoreboard` — números de marcador: Archivo Black, fondo negro, dígitos dorados con glow.
- `.wm-26` — watermark "26" gigante de fondo (usar con `aria-hidden`, dentro de contenedor `relative overflow-hidden`).
- `.chip` — pastilla pequeña condensed uppercase para badges/estados.
- `.btn-gold` / `.btn-ghost` — botones primario (dorado, texto tinta) y secundario (borde, glass).
- `.pitch-bg`, `.pitch-stripes`, `.pitch-divider`, `.divider-gold`, `.divider-green` — texturas/divisores (mantenidas).
- `.fade-up`, `.fade-up-1..4` — animación de entrada escalonada (mantenidas).
- `.hover-lift`, `.premium-glow` — elevación al hover (mantenidas).
- `.live-dot` — pulso para "en vivo" (mantenida).
- `.trophy-text` — shimmer dorado (mantenida, solo para campeón/trofeo).
- `.no-invert` — OBLIGATORIA en cada emoji e `<img>` (excepción del modo claro por inversión).

### Iconos

`components/Icon.tsx` exporta `<Icon name="..." size={18} className="..." />` con iconos de trazo
(estilo lucide). Úsalo para iconografía de UI (nav, botones, estados). Los **emojis de banderas**
(`utils/flags.ts`) se mantienen tal cual — son datos, no decoración. Emojis decorativos en contenido
pueden quedarse si aportan, siempre con `no-invert`.

Nombres disponibles: `home, calendar, ball, trophy, chart, medal, trending, target, users, globe,
stadium, book, wrench, user, sun, moon, logout, dots, search, share, x, check, clock, pin, zap,
shield, chevronRight, chevronLeft, plus, copy, send, download, lock, flame, crown`.

## 4. Patrones de página

- Toda página protegida empieza con `<PageHeader title subtitle badge live action icon />` (mismos props de siempre).
- Contenido dentro de `max-w-*` con `px-4 md:px-8 py-6` (consistente con AppShell).
- Tarjetas: `bg-panel border border-white/8 rounded-2xl` (+ `hover-lift` si son clicables) o `.ticket-card` para partidos.
- Estados: usa `chip` + color semántico (mx = acertado/en juego, gold = exacto/puntos, ca = fallado/live, us = pendiente/info).
- Loading: componentes `Skeleton`/`Spinner` existentes (ya rediseñados).
- Vacíos: estado vacío con `<Icon>` grande + mensaje en `font-condensed`.
- Jerarquía: un solo elemento héroe por página; el resto en paneles tranquilos. Menos brillos, más estructura.
- Responsive: mobile-first; el shell ya gestiona sidebar (md+) y bottom nav (móvil).

## 5. CONTRATO DE FUNCIONALIDAD (innegociable)

**Prohibido cambiar:**
1. Lógica: hooks, estados, efectos, handlers, cálculos, intervalos de polling (60s shell, 30s home, 15s chat).
2. Llamadas API (`apiFetch`), endpoints, formas de datos, tipos TypeScript.
3. Rutas (`/home`, `/matches`, `/bracket`, …) y navegación (`NavLink`/`Link`/`navigate`).
4. Claves de localStorage (`token`, `user`, `theme`) y sus formatos.
5. Nombres de equipos en español (los flags de `utils/flags.ts` dependen del string exacto).
6. Props públicos de componentes compartidos (`PageHeader`, `MatchScoreInput`, etc.).
7. Mapeos del bracket (`R32_TO_R16_SLOT`, `getPlaceholder`, numeración M73–M104) y el nodo que exporta `html-to-image`.
8. Sistema de puntos (3/1/0 + puntos por ronda) y textos de reglas que lo describen.
9. Todo el copy permanece en **español**.
10. `.no-invert` en emojis e imágenes (el modo claro funciona por inversión CSS).

**Permitido y deseado:** reestructurar JSX, cambiar todas las clases, reordenar secciones,
mejorar jerarquía visual, microcopy de etiquetas decorativas, accesibilidad (aria-labels, focus rings `focus-visible:ring-gold/40`).

## 6. Plan de ejecución ("plugins"/herramientas)

1. **Explore agent** → mapa completo del frontend (hecho).
2. **Base (sesión principal)** → `index.css` v2, `Icon.tsx`, shell (`Sidebar`, `BottomNav`, `AppShell`),
   `PageHeader`, `MatchScoreInput`, `PredictionProgress`, `Skeleton`, `Spinner`, Toaster, `index.html`.
3. **7 agentes en paralelo** (lotes por afinidad):
   - A: Landing + Login + Register + OAuthCallback + NotFound
   - B: Home + Rules
   - C: Matches + Calendar + MyPredictions
   - D: Bracket (solo, es el más complejo)
   - E: Leaderboard + Groups + GroupLeaderboard + Compare
   - F: Teams + Stadiums + Standings + Stats
   - G: Profile + Admin
4. **Verificación**: `eslint` por archivo en cada agente; al final `tsc -b && vite build`, `vitest run`, barrido de consistencia (grep de clases legacy/hex sueltos), captura visual.

## 7. Criterios de aceptación

- `npm run build` y `npm test` en verde.
- Las 21 rutas renderizan con la nueva identidad y la misma funcionalidad.
- Modo claro/oscuro sigue funcionando (toggle + persistencia).
- Badge de partidos sin predecir sigue visible en Sidebar/BottomNav.
- Export del bracket a PNG sigue funcionando.
