"""Entrena el modelo de predicción por partido y exporta frontend/src/predict/model.json.

Pipeline:
  1. Carga el dataset histórico (martj42).
  2. Reproduce el Elo eloratings.net pre-partido (elo.py) sobre TODO el histórico.
  3. Calibra la escala del Elo reproducido contra ratings.ts (factor `a`).
  4. Split temporal: entrena GLM de Poisson y rho (Dixon-Coles) en el pasado, valida en
     el periodo reciente.
  5. Reporta log-loss / Brier / RPS / accuracy / MAE y los compara con baselines
     (Elo+Poisson actual y tasas base ingenuas).
  6. Exporta los coeficientes a model.json.

Uso:  python train.py        (desde la carpeta ml/, con el venv activado)
"""
from __future__ import annotations

import json
import os
import re

import numpy as np
import pandas as pd
import statsmodels.api as sm
from scipy.optimize import minimize_scalar
from scipy.stats import poisson

from elo import compute_elo_timeline, fit_scale_to_reference
from features import ELO_SCALE, build_training_rows, predict_lambdas, scaled_elo_diff

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_CSV = os.path.join(HERE, "data", "results.csv")
RATINGS_TS = os.path.join(HERE, "..", "frontend", "src", "utils", "ratings.ts")
MODEL_OUT = os.path.join(HERE, "..", "frontend", "src", "predict", "model.json")

TEST_START = "2022-01-01"   # holdout temporal: validar con WC2022, Euro2024, Copa2024, etc.
MAX_GOALS = 10


# --------------------------------------------------------------------------- carga de datos
def load_reference_elo() -> dict:
    """Parsea ELO_RATINGS de ratings.ts -> {nombreES: elo}."""
    text = open(RATINGS_TS, encoding="utf-8").read()
    block = text.split("ELO_RATINGS")[1]
    pairs = re.findall(r"'([^']+)'\s*:\s*(\d+)", block)
    return {name: int(val) for name, val in pairs}


def load_matches() -> pd.DataFrame:
    df = pd.read_csv(DATA_CSV)
    df = df.dropna(subset=["home_team", "away_team"])
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date"])
    df["neutral"] = df["neutral"].astype(str).str.upper().eq("TRUE")
    df = df.sort_values("date", kind="stable").reset_index(drop=True)
    return df


# ------------------------------------------------------------------- Dixon-Coles / matriz
def score_matrix(lam_h: float, lam_a: float, rho: float, kmax: int = MAX_GOALS) -> np.ndarray:
    ks = np.arange(kmax + 1)
    ph = poisson.pmf(ks, lam_h)
    pa = poisson.pmf(ks, lam_a)
    m = np.outer(ph, pa)
    m[0, 0] *= 1.0 - lam_h * lam_a * rho
    m[0, 1] *= 1.0 + lam_h * rho
    m[1, 0] *= 1.0 + lam_a * rho
    m[1, 1] *= 1.0 - rho
    m = np.clip(m, 0.0, None)
    s = m.sum()
    return m / s if s > 0 else m


def outcome_probs(m: np.ndarray) -> tuple[float, float, float]:
    """(P(gana local), P(empate), P(gana visita)) desde la matriz P(home=i, away=j)."""
    p_home = float(np.tril(m, -1).sum())
    p_draw = float(np.trace(m))
    p_away = float(np.triu(m, 1).sum())
    return p_home, p_draw, p_away


def fit_rho(lam_h: np.ndarray, lam_a: np.ndarray, hs: np.ndarray, as_: np.ndarray) -> float:
    """MLE de rho: solo las celdas (0/1, 0/1) aportan a la verosimilitud."""
    def neg_ll(rho: float) -> float:
        tau = np.ones_like(lam_h)
        m00 = (hs == 0) & (as_ == 0); tau[m00] = 1.0 - lam_h[m00] * lam_a[m00] * rho
        m01 = (hs == 0) & (as_ == 1); tau[m01] = 1.0 + lam_h[m01] * rho
        m10 = (hs == 1) & (as_ == 0); tau[m10] = 1.0 + lam_a[m10] * rho
        m11 = (hs == 1) & (as_ == 1); tau[m11] = 1.0 - rho
        return -np.sum(np.log(np.clip(tau, 1e-9, None)))

    res = minimize_scalar(neg_ll, bounds=(-0.2, 0.2), method="bounded")
    return float(res.x)


# ------------------------------------------------------------------------------- métricas
def outcome_index(hs: int, as_: int) -> int:
    return 0 if hs > as_ else 1 if hs == as_ else 2  # 0=local, 1=empate, 2=visita


def metrics_from_probs(probs: np.ndarray, actual: np.ndarray) -> dict:
    """probs: (n,3) [pH,pD,pA]; actual: (n,) índice 0/1/2."""
    eps = 1e-15
    p = np.clip(probs, eps, 1.0)
    n = len(actual)
    onehot = np.zeros((n, 3)); onehot[np.arange(n), actual] = 1.0
    logloss = float(-np.mean(np.log(p[np.arange(n), actual])))
    brier = float(np.mean(np.sum((probs - onehot) ** 2, axis=1)))
    cdf_p = np.cumsum(probs, axis=1)[:, :2]
    cdf_y = np.cumsum(onehot, axis=1)[:, :2]
    rps = float(np.mean(np.sum((cdf_p - cdf_y) ** 2, axis=1) / 2.0))
    acc = float(np.mean(np.argmax(probs, axis=1) == actual))
    return {"logloss": logloss, "brier": brier, "rps": rps, "accuracy": acc}


def model_probs(test: pd.DataFrame, scale_a, b0, be, g, rho) -> np.ndarray:
    lam_h, lam_a = predict_lambdas(test, scale_a, b0, be, g)
    out = np.empty((len(test), 3))
    for i in range(len(test)):
        out[i] = outcome_probs(score_matrix(lam_h[i], lam_a[i], rho))
    return out


def baseline_elo_poisson_probs(test: pd.DataFrame, scale_a) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Modelo actual de Carlomagno por partido: winExpectancy(tau=1) -> Poisson independiente.
    Conserva el total de goles en 2*1.3 (igual que eloToLambdas)."""
    diff = scaled_elo_diff(test, scale_a)  # ya viene /ELO_SCALE
    p_home_win = 1.0 / (1.0 + np.power(10.0, -diff))  # = winExpectancy(elo, tau=1)
    base_lambda = 1.3
    lam_h = base_lambda * 2 * p_home_win
    lam_a = base_lambda * 2 * (1 - p_home_win)
    out = np.empty((len(test), 3))
    for i in range(len(test)):
        out[i] = outcome_probs(score_matrix(lam_h[i], lam_a[i], 0.0))  # rho=0 -> Poisson puro
    return out, lam_h, lam_a


# ----------------------------------------------------------------------------------- main
def main() -> None:
    print("· Cargando datos y reproduciendo Elo eloratings.net…")
    df = load_matches()
    df, final_ratings = compute_elo_timeline(df)

    reference = load_reference_elo()
    scale_a, scale_b, r2, n_pairs = fit_scale_to_reference(final_ratings, reference)
    print(f"  Calibración Elo→ratings.ts:  a={scale_a:.4f}  b={scale_b:.1f}  R²={r2:.3f}  (n={n_pairs})")

    played = df.dropna(subset=["home_score", "away_score"]).copy()
    played["home_score"] = played["home_score"].astype(int)
    played["away_score"] = played["away_score"].astype(int)

    train = played[played["date"] < TEST_START]
    test = played[(played["date"] >= TEST_START)]
    print(f"· Train: {len(train):,} partidos (<{TEST_START})   Test: {len(test):,} partidos (≥{TEST_START})")

    # ---- GLM de Poisson sobre goles
    rows = build_training_rows(train, scale_a)
    X = sm.add_constant(rows[["elo_diff_scaled", "is_home"]])
    glm = sm.GLM(rows["goals"], X, family=sm.families.Poisson()).fit()
    b0 = float(glm.params["const"])
    be = float(glm.params["elo_diff_scaled"])
    g = float(glm.params["is_home"])
    print(f"· GLM Poisson:  intercept={b0:.4f}  eloDiff={be:.4f}  homeAdv={g:.4f}")

    # ---- rho de Dixon-Coles sobre el train
    lam_h_tr, lam_a_tr = predict_lambdas(train, scale_a, b0, be, g)
    rho = fit_rho(lam_h_tr, lam_a_tr,
                  train["home_score"].to_numpy(), train["away_score"].to_numpy())
    print(f"· Dixon-Coles rho={rho:.4f}")

    # ---- evaluación en el holdout
    actual = np.array([outcome_index(h, a) for h, a in
                       zip(test["home_score"], test["away_score"])])

    m_probs = model_probs(test, scale_a, b0, be, g, rho)
    m_metrics = metrics_from_probs(m_probs, actual)
    lam_h_te, lam_a_te = predict_lambdas(test, scale_a, b0, be, g)
    m_metrics["goals_mae"] = float(np.mean(
        (np.abs(lam_h_te - test["home_score"].to_numpy())
         + np.abs(lam_a_te - test["away_score"].to_numpy())) / 2.0))

    base_probs, blh, bla = baseline_elo_poisson_probs(test, scale_a)
    base_metrics = metrics_from_probs(base_probs, actual)
    base_metrics["goals_mae"] = float(np.mean(
        (np.abs(blh - test["home_score"].to_numpy())
         + np.abs(bla - test["away_score"].to_numpy())) / 2.0))

    rates = np.bincount(np.array([outcome_index(h, a) for h, a in
                                  zip(train["home_score"], train["away_score"])]),
                        minlength=3) / len(train)
    naive_probs = np.tile(rates, (len(test), 1))
    naive_metrics = metrics_from_probs(naive_probs, actual)

    print("\n  Métrica        Modelo ML   Elo+Poisson   Naïve")
    for k in ["logloss", "brier", "rps", "accuracy"]:
        print(f"  {k:<12} {m_metrics[k]:>9.4f}   {base_metrics[k]:>9.4f}   {naive_metrics[k]:>7.4f}")
    print(f"  {'goals_mae':<12} {m_metrics['goals_mae']:>9.4f}   {base_metrics['goals_mae']:>9.4f}        —")

    better = m_metrics["logloss"] <= base_metrics["logloss"]
    print(f"\n  → ML {'IGUALA/SUPERA' if better else 'NO supera'} al baseline Elo+Poisson "
          f"(log-loss {m_metrics['logloss']:.4f} vs {base_metrics['logloss']:.4f})")

    # ---- export
    model = {
        "version": 1,
        "source": "martj42/international_results",
        "trainedThrough": str(train["date"].max().date()),
        "testPeriod": f"{TEST_START}..{str(test['date'].max().date())}",
        "coef": {"intercept": b0, "eloDiff": be, "homeAdv": g},
        "eloScale": ELO_SCALE,
        "dixonColesRho": rho,
        "maxGoals": MAX_GOALS,
        "eloCalibration": {"scaleA": scale_a, "r2": r2},
        "metrics": {"model": m_metrics, "baselineEloPoisson": base_metrics,
                    "baselineNaive": naive_metrics},
    }
    os.makedirs(os.path.dirname(MODEL_OUT), exist_ok=True)
    with open(MODEL_OUT, "w", encoding="utf-8") as f:
        json.dump(model, f, indent=2, ensure_ascii=False)
    print(f"\n✓ Exportado {os.path.relpath(MODEL_OUT, HERE)}")


if __name__ == "__main__":
    main()
