"""
fetch_shots.py — Scrapea los tiros del Mundial 2026 desde la API OFICIAL de FIFA
y los aplana a shots.csv listo para analizar.

Fuente (pública, gratuita, en vivo):
  - Calendario:  https://api.fifa.com/api/v3/calendar/matches?idCompetition=17&idSeason=285023
  - Timeline:    https://api.fifa.com/api/v3/timelines/17/285023/{stage}/{match}

Cada evento del timeline trae PositionX / PositionY (cancha normalizada 0-100).
Los tiros son:
  - Type 0  -> "Goal!"            (gol)
  - Type 12 -> "Attempt at Goal"  (remate sin gol)

OJO con la dirección: la API da posición ABSOLUTA en cancha, y los equipos
cambian de lado por tiempo, así que un mismo equipo dispara hacia X=0 y hacia
X=100. Plegamos todo hacia el arco X=100 (si X<50, espejo).

Solo librería estándar. Los timelines crudos se cachean en .cache/ (gitignored).
Cortesía: peticiones secuenciales (son ~30) para no martillar la API de FIFA.
"""
import json
import math
import os
import csv
from urllib.request import urlopen, Request

COMP, SEASON = "17", "285023"  # FIFA World Cup 2026
BASE = "https://api.fifa.com/api/v3"

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, ".cache", "timelines")
OUT_CSV = os.path.join(HERE, "shots.csv")
os.makedirs(CACHE, exist_ok=True)

# Tipos de evento del timeline que son TIROS del equipo atacante:
#   0  -> "Goal!"            (gol en juego)
#   12 -> "Attempt at Goal"  (remate sin gol)
#   41 -> "Penalty Goal"     (penal convertido; trae coords en el punto de penal)
# Se EXCLUYEN: 34 "Own goal", 57 "Goal Prevention" (acción defensiva), 6 "Penalty Awarded".
SHOT_TYPES = {0, 12, 41}
GOAL_TYPES = {0, 41}
PEN_TYPE = 41
PITCH_L, PITCH_W = 105.0, 68.0     # metros (para reportar distancias)

# Área grande en coords 0-100 (16.5m profundidad, 40.3m ancho)
BOX_X = 100 - 16.5 / PITCH_L * 100          # >= 84.29
BOX_HALF_W = 20.16 / PITCH_W * 100          # +/- 29.65 respecto al centro (Y=50)


def get(url):
    req = Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"})
    with urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def get_timeline(stage, match):
    path = os.path.join(CACHE, f"{match}.json")
    if os.path.exists(path) and os.path.getsize(path) > 10:
        with open(path) as f:
            return json.load(f)
    data = get(f"{BASE}/timelines/{COMP}/{SEASON}/{stage}/{match}?language=en")
    with open(path, "w") as f:
        json.dump(data, f)
    return data


def fold(x, y):
    """Pliega la cancha para que TODOS ataquen hacia el arco X=100."""
    return (100 - x, 100 - y) if x < 50 else (x, y)


def dist_m(x, y):
    """Distancia al centro del arco (X=100, Y=50) en metros."""
    dx = (100 - x) / 100 * PITCH_L
    dy = (50 - y) / 100 * PITCH_W
    return math.hypot(dx, dy)


def inside_box(x, y):
    return x >= BOX_X and (50 - BOX_HALF_W) <= y <= (50 + BOX_HALF_W)


def team_map(match):
    """IdTeam -> nombre, desde Home/Away del registro de calendario."""
    m = {}
    for side in ("Home", "Away"):
        t = match.get(side) or {}
        name = (t.get("TeamName") or [{}])[0].get("Description", "?")
        if t.get("IdTeam"):
            m[t["IdTeam"]] = name
    return m


def extract_shots(match, events):
    tmap = team_map(match)
    rows = []
    for ev in events:
        if ev.get("Type") not in SHOT_TYPES:
            continue
        px, py = ev.get("PositionX"), ev.get("PositionY")
        if px is None or py is None:
            if ev.get("Type") == PEN_TYPE:
                px, py = 100 - 11 / PITCH_L * 100, 50.0   # punto de penal (determinista)
            else:
                continue
        x, y = fold(float(px), float(py))
        desc = (ev.get("EventDescription") or [{}])[0].get("Description", "")
        rows.append({
            "match_id": match["IdMatch"],
            "date": match["Date"][:10],
            "team": tmap.get(ev.get("IdTeam"), "?"),
            "player": _player_from(desc),
            "minute": ev.get("MatchMinute", ""),
            "x": round(x, 2),
            "y": round(y, 2),
            "dist_m": round(dist_m(x, y), 2),
            "is_goal": int(ev.get("Type") in GOAL_TYPES),
            "is_penalty": int(ev.get("Type") == PEN_TYPE),
            "inside_box": int(inside_box(x, y)),
            "type": (ev.get("TypeLocalized") or [{}])[0].get("Description", ""),
        })
    return rows


def _player_from(desc):
    # "VINICIUS JUNIOR (Brazil) attempts ..." -> "VINICIUS JUNIOR"
    return desc.split("(")[0].strip() if "(" in desc else ""


def main():
    print(f"Calendario Mundial 2026 (comp={COMP}, season={SEASON})...")
    cal = get(f"{BASE}/calendar/matches?idCompetition={COMP}&idSeason={SEASON}&count=200&language=en")
    played = [m for m in cal["Results"] if m.get("MatchStatus") == 0]
    print(f"  {len(played)} partidos finalizados.")

    all_rows = []
    for i, match in enumerate(played, 1):
        try:
            tl = get_timeline(match["IdStage"], match["IdMatch"])
            all_rows.extend(extract_shots(match, tl.get("Event") or []))
        except Exception as e:
            print(f"  [WARN] match {match['IdMatch']} falló: {e}")
        if i % 10 == 0 or i == len(played):
            print(f"  {i}/{len(played)} partidos...")

    fields = ["match_id", "date", "team", "player", "minute", "x", "y",
              "dist_m", "is_goal", "is_penalty", "inside_box", "type"]
    with open(OUT_CSV, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(all_rows)

    goals = sum(r["is_goal"] for r in all_rows)
    print(f"\nOK -> {OUT_CSV}")
    print(f"  {len(all_rows)} tiros, {goals} goles, {len(played)} partidos.")


if __name__ == "__main__":
    main()
