# Modelo de predicción por partido (ML)

Pipeline **offline en Python** que entrena el modelo usado por la caja del partido y
exporta sus coeficientes a [`frontend/src/predict/model.json`](../frontend/src/predict/model.json).
La app NO ejecuta Python: en runtime evalúa el `model.json` con TypeScript puro
([`frontend/src/predict/predictMatch.ts`](../frontend/src/predict/predictMatch.ts)).

## Modelo

- **Regresión de Poisson sobre goles** (GLM, statsmodels): predice los goles esperados de
  cada equipo a partir de la diferencia de Elo y de la ventaja de localía.
- **Corrección Dixon-Coles** (parámetro `ρ` por MLE) para los marcadores bajos (0-0, 1-0,
  0-1, 1-1). De los dos λ se derivan, en forma cerrada, 1X2, top-3 marcadores y xG.
- **Elo estilo eloratings.net** ([`elo.py`](elo.py)) reproducido sobre todo el histórico para
  generar el Elo pre-partido de cada feature. Se **calibra** linealmente a la escala de
  `ratings.ts` (el factor de escala se aplica al entrenar; en inferencia se usa el Elo de
  `ratings.ts` directamente). `elo.py` y `frontend/src/predict/elo.ts` comparten la misma
  fórmula — **mantenerlos sincronizados**.

## Reproducir el entrenamiento

```bash
cd ml

# 1) Entorno virtual + dependencias
python3 -m venv .venv
./.venv/bin/python -m pip install -r requirements.txt

# 2) Descargar el dataset histórico (martj42, libre, sin auth)
mkdir -p data
curl -sSL -o data/results.csv \
  https://raw.githubusercontent.com/martj42/international_results/master/results.csv

# 3) Entrenar y exportar frontend/src/predict/model.json
./.venv/bin/python train.py
```

`data/` y `.venv/` están en `.gitignore`; `model.json` SÍ se commitea.

## Validación

`train.py` usa un **holdout temporal** (entrena con partidos `<2022`, valida con los
posteriores: Mundial 2022, Euro 2024, Copa América 2024…) y reporta log-loss, Brier, RPS,
accuracy y MAE de goles, comparando contra dos baselines: el modelo Elo+Poisson actual del
simulador y las tasas base ingenuas.

Última corrida (holdout ≈4.5k partidos): el modelo ML supera al baseline Elo+Poisson en
log-loss (0.876 vs 0.916), Brier, RPS y accuracy (60.2% vs 59.2%). Calibración Elo↔ratings.ts
con R²≈0.97. Ver `metrics` dentro de `model.json`.

## Pendiente (post-Mundial)

Reentrenamiento completo periódico (p. ej. GitHub Action) para incorporar los resultados del
Mundial 2026 de cara a futuros torneos. Durante el torneo NO se reentrena: el Elo en vivo
(`frontend/src/predict/elo.ts`) ya hace que las predicciones reaccionen a los resultados.
