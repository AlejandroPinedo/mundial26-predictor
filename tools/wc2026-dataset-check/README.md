# wc2026-dataset-check

Validación **read-only** del dataset abierto [`rezarahiminia/worldcup2026`](https://github.com/rezarahiminia/worldcup2026)
contra los datos que ya tiene este proyecto. No toca la base de datos ni el
código de la app: solo lee archivos y emite un reporte de diferencias.

## Uso

```bash
node tools/wc2026-dataset-check/check.mjs
```

Compara:

- `frontend/src/utils/flags.ts` — 48 (+5) equipos ES → ISO2
- `frontend/src/pages/StadiumsPage.tsx` — 16 estadios hardcodeados
- `backend/scripts/matches-backup.json` — respaldo del fixture real (72 grupos)

## Resultado (2026-06-18)

- **Equipos: 48/48 consistentes** por ISO2 (con alias `gb-eng↔ENG`, `gb-sct↔SCO`).
  `flags.ts` tiene 5 selecciones extra no clasificadas (Bolivia, Chile, Honduras,
  Perú, Venezuela) — superset esperado, no es error.
- **Fixtures: 72/72 enfrentamientos de grupo coinciden** → el externo refleja el
  mismo sorteo oficial que ya usa el proyecto. **Dataset confiable.**
- **Estadios: 16/16 emparejados.** 11 de 16 difieren en capacidad: las del externo
  están redondeadas (cifras FIFA), las locales son específicas. **No sobrescribir a
  ciegas** — decisión humana caso por caso (ej. AT&T 80 000 local vs 94 000 externo).

## Qué puede aportar el externo (enriquecimiento)

Por partido: `grupo` · `jornada (matchday)` · `estadio asignado`.
Por equipo: `fifa_code` (3 letras) + `iso2`. Por estadio: `fifa_name` oficial + `region`.

## Atribución

Datos en `external/` copiados de `rezarahiminia/worldcup2026`, **licencia ISC**
(reuso permitido con atribución). Snapshot tomado el 2026-06-18.
`external/` es un snapshot vendorizado; regenerar con la API de GitHub si hace falta.
