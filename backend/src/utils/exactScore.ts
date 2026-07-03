// Bonus por MARCADOR EXACTO en partidos de eliminatoria (+2 c/u).
//
// Reglas (acordadas):
//  - Partido normal (definido en tiempo/prórroga): +2 si el marcador predicho es
//    idéntico al real.
//  - Partido a PENALES (empate en el tiempo → tanda): +2 SOLO si aciertas el
//    marcador exacto ANTES de penales (el empate) Y el marcador exacto de la tanda.
//
// Nota: un partido KO nunca termina en empate "real"; si home==away es porque fue
// a penales (home_pen/away_pen definen al ganador). La comparación es directa
// porque en 16avos los cruces son FIJOS (mismos equipos para todos); para rondas
// posteriores el llamador debe además verificar que el CRUCE coincida.

export const EXACT_SCORE_BONUS = 2

export type Score = {
  home: number | null
  away: number | null
  homePen: number | null
  awayPen: number | null
}

/** true si `pred` acierta EXACTAMENTE el resultado real `actual` (incl. penales si hubo). */
export function isExactScore(pred: Score, actual: Score): boolean {
  if (actual.home == null || actual.away == null) return false // sin resultado real
  if (pred.home == null || pred.away == null) return false // sin predicción
  if (pred.home !== actual.home || pred.away !== actual.away) return false

  // Empate en el tiempo → se definió por penales: exige acertar también la tanda.
  const wentToPens = actual.home === actual.away
  if (wentToPens) {
    if (actual.homePen == null || actual.awayPen == null) return false // dato incompleto
    return pred.homePen === actual.homePen && pred.awayPen === actual.awayPen
  }
  return true
}

/** Puntos por marcador exacto de un partido: EXACT_SCORE_BONUS o 0. */
export function exactScorePoints(pred: Score, actual: Score): number {
  return isExactScore(pred, actual) ? EXACT_SCORE_BONUS : 0
}
