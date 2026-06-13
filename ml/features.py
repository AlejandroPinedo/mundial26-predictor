"""Construcción de features para el GLM de Poisson.

Cada partido histórico se expande en DOS filas equipo-partido (perspectiva del
local y del visitante), porque el modelo predice los goles que anota un equipo en
función de su ventaja de Elo sobre el rival y de si juega como local.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

ELO_SCALE = 400.0  # divisor de la diferencia de Elo (escala logística estándar)


def scaled_elo_diff(df: pd.DataFrame, scale_a: float) -> np.ndarray:
    """(elo_local - elo_visita) llevado a la escala de ratings.ts (× scale_a) y /ELO_SCALE."""
    return (df["home_elo_pre"].to_numpy() - df["away_elo_pre"].to_numpy()) * scale_a / ELO_SCALE


def build_training_rows(df: pd.DataFrame, scale_a: float) -> pd.DataFrame:
    """Devuelve filas equipo-partido con columnas: goals, elo_diff_scaled, is_home.

    - Fila local: goals=home_score, elo_diff_scaled=+diff, is_home=1 si NO es neutral.
    - Fila visita: goals=away_score, elo_diff_scaled=-diff, is_home=0 (la localía la
      tiene solo el equipo de casa).
    """
    df = df.dropna(subset=["home_score", "away_score"]).copy()
    elo_diff = scaled_elo_diff(df, scale_a)
    home_field = (~df["neutral"].to_numpy(dtype=bool)).astype(float)  # 1 si hay localía real

    home_rows = pd.DataFrame({
        "goals": df["home_score"].astype(int).to_numpy(),
        "elo_diff_scaled": elo_diff,
        "is_home": home_field,
    })
    away_rows = pd.DataFrame({
        "goals": df["away_score"].astype(int).to_numpy(),
        "elo_diff_scaled": -elo_diff,
        "is_home": np.zeros(len(df)),
    })
    return pd.concat([home_rows, away_rows], ignore_index=True)


def predict_lambdas(df: pd.DataFrame, scale_a: float, beta0: float, beta_elo: float,
                    gamma: float) -> tuple[np.ndarray, np.ndarray]:
    """Goles esperados (lambda) de local y visita para cada partido del df.

    Replica la inferencia que hará el runtime TS:
      lamH = exp(beta0 + beta_elo*diff + gamma*localH)
      lamA = exp(beta0 - beta_elo*diff)
    """
    diff = scaled_elo_diff(df, scale_a)
    home_field = (~df["neutral"].to_numpy(dtype=bool)).astype(float)
    lam_home = np.exp(beta0 + beta_elo * diff + gamma * home_field)
    lam_away = np.exp(beta0 - beta_elo * diff)
    return lam_home, lam_away
