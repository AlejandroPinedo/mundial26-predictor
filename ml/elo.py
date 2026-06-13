"""Motor de Elo estilo eloratings.net.

Reproduce el algoritmo de https://www.eloratings.net/about para generar el Elo
PREVIO a cada partido histórico. Estos Elo pre-partido son las features del modelo.

El runtime de la app (`frontend/src/predict/elo.ts`) replica EXACTAMENTE estas
fórmulas (`expected_home`, `mov_multiplier`, `k_factor`) sobre la escala de
`ratings.ts`, de modo que el Elo en vivo durante el Mundial sea consistente con
el entrenamiento. Mantener ambos archivos sincronizados.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

INITIAL_ELO = 1500.0
HOME_ADVANTAGE = 100.0  # puntos que se suman al local en el cálculo de expectativa (si no es neutral)

# Mapeo de nombres EN (dataset martj42) -> ES (claves de frontend/src/utils/ratings.ts).
# Solo se usa para calibrar la escala del Elo reproducido contra ratings.ts; el modelo
# en sí es agnóstico a nombres (solo usa la diferencia de Elo).
NAME_MAP_EN_ES = {
    "Algeria": "Argelia", "Argentina": "Argentina", "Australia": "Australia",
    "Austria": "Austria", "Belgium": "Bélgica", "Bosnia and Herzegovina": "Bosnia y Herzegovina",
    "Brazil": "Brasil", "Canada": "Canadá", "Cape Verde": "Cabo Verde", "Colombia": "Colombia",
    "Croatia": "Croacia", "Curaçao": "Curazao", "Czech Republic": "República Checa",
    "DR Congo": "República Democrática del Congo", "Ecuador": "Ecuador", "Egypt": "Egipto",
    "England": "Inglaterra", "France": "Francia", "Germany": "Alemania", "Ghana": "Ghana",
    "Haiti": "Haití", "Iran": "Irán", "Iraq": "Irak", "Ivory Coast": "Costa de Marfil",
    "Japan": "Japón", "Jordan": "Jordania", "Mexico": "México", "Morocco": "Marruecos",
    "Netherlands": "Países Bajos", "New Zealand": "Nueva Zelanda", "Norway": "Noruega",
    "Panama": "Panamá", "Paraguay": "Paraguay", "Portugal": "Portugal", "Qatar": "Catar",
    "Saudi Arabia": "Arabia Saudí", "Scotland": "Escocia", "Senegal": "Senegal",
    "South Africa": "Sudáfrica", "South Korea": "Corea del Sur", "Spain": "España",
    "Sweden": "Suecia", "Switzerland": "Suiza", "Tunisia": "Túnez", "Turkey": "Turquía",
    "United States": "Estados Unidos", "Uruguay": "Uruguay", "Uzbekistan": "Uzbekistán",
}


def k_factor(tournament: str) -> float:
    """Índice de peso K según la importancia del torneo (eloratings.net)."""
    t = (tournament or "").lower()
    if "world cup" in t and "qualif" not in t:
        return 60.0
    if "qualif" in t or "nations league" in t:
        return 40.0
    if "friendly" in t:
        return 20.0
    major = ["euro", "copa américa", "copa america", "african cup of nations",
             "afc asian cup", "gold cup", "confederations", "concacaf championship"]
    if any(m in t for m in major):
        return 50.0
    return 30.0


def mov_multiplier(goal_diff: int) -> float:
    """Multiplicador por margen de victoria (number-of-goals index de eloratings.net)."""
    g = abs(int(goal_diff))
    if g <= 1:
        return 1.0
    if g == 2:
        return 1.5
    if g == 3:
        return 1.75
    return 1.75 + (g - 3) / 8.0


def expected_home(elo_home: float, elo_away: float, neutral: bool) -> float:
    """Expectativa de resultado del local (1=victoria, .5=empate) con ventaja de localía."""
    dr = (elo_home + (0.0 if neutral else HOME_ADVANTAGE)) - elo_away
    return 1.0 / (10 ** (-dr / 400.0) + 1.0)


def compute_elo_timeline(df: pd.DataFrame):
    """Recorre los partidos en orden cronológico y devuelve:
    - df con columnas extra `home_elo_pre`, `away_elo_pre` (Elo ANTES del partido)
    - dict {equipo: Elo final} tras procesar todos los partidos jugados

    Solo los partidos con marcador (no NaN) actualizan los ratings; los futuros
    (Mundial 2026) reciben su Elo pre-partido pero no alteran nada.
    `df` debe venir ordenado por fecha y con columna booleana `neutral`.
    """
    ratings: dict[str, float] = {}
    n = len(df)
    home_pre = np.empty(n)
    away_pre = np.empty(n)
    for i, row in enumerate(df.itertuples(index=False)):
        h, a = row.home_team, row.away_team
        eh = ratings.get(h, INITIAL_ELO)
        ea = ratings.get(a, INITIAL_ELO)
        home_pre[i] = eh
        away_pre[i] = ea
        hs, as_ = row.home_score, row.away_score
        if pd.isna(hs) or pd.isna(as_):
            continue
        hs, as_ = int(hs), int(as_)
        we = expected_home(eh, ea, bool(row.neutral))
        w = 1.0 if hs > as_ else 0.5 if hs == as_ else 0.0
        change = k_factor(row.tournament) * mov_multiplier(hs - as_) * (w - we)
        ratings[h] = eh + change
        ratings[a] = ea - change
    out = df.copy()
    out["home_elo_pre"] = home_pre
    out["away_elo_pre"] = away_pre
    return out, ratings


def fit_scale_to_reference(my_ratings_en: dict, reference_es: dict):
    """Ajusta `reference ≈ a*my + b` por mínimos cuadrados sobre las 48 selecciones.

    Como el modelo usa SOLO diferencias de Elo, el offset `b` se cancela y únicamente
    importa el factor de escala `a` (convierte la dispersión del Elo reproducido a la
    de ratings.ts). Devuelve (a, b, r2, n_pairs).
    """
    xs, ys = [], []
    for en, es in NAME_MAP_EN_ES.items():
        if en in my_ratings_en and es in reference_es:
            xs.append(my_ratings_en[en])
            ys.append(reference_es[es])
    xs, ys = np.array(xs, dtype=float), np.array(ys, dtype=float)
    a, b = np.polyfit(xs, ys, 1)
    pred = a * xs + b
    ss_res = float(((ys - pred) ** 2).sum())
    ss_tot = float(((ys - ys.mean()) ** 2).sum())
    r2 = 1.0 - ss_res / ss_tot if ss_tot > 0 else 0.0
    return float(a), float(b), float(r2), len(xs)
