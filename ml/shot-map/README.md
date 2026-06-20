# Shot map — Mundial 2026 (dónde se dispara y dónde entra)

Reproduce el análisis tipo "shot map" / base de xG sobre datos **reales y en vivo**
del Mundial 2026, scrapeados de la **API oficial de FIFA** (gratis, pública).

```
python3 fetch_shots.py   # baja timelines de FIFA -> shots.csv  (cachea en .cache/)
python3 shot_map.py      # imprime métricas + genera shot_map.png
```

## Fuente de datos (API FIFA)

| Recurso | URL |
|---|---|
| Calendario | `api.fifa.com/api/v3/calendar/matches?idCompetition=17&idSeason=285023` |
| Timeline (eventos) | `api.fifa.com/api/v3/timelines/17/285023/{stage}/{match}` |

- `IdCompetition=17` = FIFA World Cup · `IdSeason=285023` = 2026.
- Solo se procesan partidos `MatchStatus == 0` (finalizados).
- Cada evento de tiro trae **`PositionX` / `PositionY`** en cancha normalizada **0–100**.

## Modelo de eventos (qué es un tiro)

| Type | Evento | Uso |
|---|---|---|
| 0 | Goal! | gol en juego ✅ |
| 12 | Attempt at Goal | remate sin gol ✅ |
| 41 | Penalty Goal | penal convertido ✅ (`is_penalty=1`) |
| 34 | Own goal | autogol ❌ excluido |
| 57 | Goal Prevention | acción defensiva ❌ excluido |
| 6 | Penalty Awarded | concesión, no el tiro ❌ excluido |

## Detalles de procesamiento

- **Dirección**: la API da posición absoluta y los equipos cambian de lado, así que
  se *pliega* todo hacia el arco `X=100` (si `X<50`, espejo). Sin esto, los goles de
  un mismo equipo aparecen en los dos arcos.
- **Distancia**: se escala 0–100 → cancha real 105×68 m; distancia al centro del arco.
- **Área**: dentro = `X ≥ 84.3` y `20.4 ≤ Y ≤ 79.6` (16.5 m × 40.3 m).
- Un `Type 41` sin coords cae al punto de penal (11 m, centrado) por defecto.

## Notas / límites

- Cortesía con la API: peticiones secuenciales + cache en disco (`.cache/`, gitignored).
  No redistribuir el dato crudo (Términos de Servicio de FIFA).
- Los números cambian con cada jornada (al re-ejecutar entran los partidos nuevos).
- Conversión "sin penales" es la métrica honesta para la historia dentro/fuera del área.
