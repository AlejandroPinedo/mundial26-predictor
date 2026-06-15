// Coeficientes del modelo entrenado (GLM de Poisson + rho de Dixon-Coles).
// ESPEJO de frontend/src/predict/model.json (version 1) — el frontend es la
// fuente de verdad, que a su vez se genera con ml/train.py. Mantener en sync
// cuando se reentrene el modelo. La paridad se valida en predict.test.ts.
export const MODEL = {
  version: 1,
  coef: {
    intercept: 0.17973036187665953,
    eloDiff: 0.6544379626335952,
    homeAdv: 0.3074401643782563,
  },
  eloScale: 400.0,
  dixonColesRho: -0.052302279731103,
  maxGoals: 10,
} as const
