// Carga el modelo entrenado (coeficientes del GLM de Poisson + rho de Dixon-Coles).
// model.json se genera con ml/train.py — NO editar a mano. Ver ml/README.md.
import modelJson from './model.json'

export type PredictModel = {
  version: number
  source: string
  trainedThrough: string
  testPeriod: string
  coef: { intercept: number; eloDiff: number; homeAdv: number }
  eloScale: number
  dixonColesRho: number
  maxGoals: number
  eloCalibration: { scaleA: number; r2: number }
  metrics: Record<string, Record<string, number>>
}

export const MODEL = modelJson as PredictModel
