// Bono de penales del bracket (Esquema 2): +1 punto por cada llave eliminatoria
// donde el usuario predijo que se definía por penales Y la llave real (mismo par
// de equipos, misma ronda) efectivamente fue a la tanda. El GANADOR de la tanda
// ya lo premia el puntaje de avance, así que el bono solo reconoce haber "leído"
// que el cruce sería parejo.
export const SHOOTOUT_BONUS = 1

export type ShootoutTie = { round: string; teamA: string; teamB: string }

// Clave canónica de una llave: ronda + par de equipos sin importar el orden.
const tieKey = (round: string, a: string, b: string) => `${round}|${[a, b].sort().join('|')}`

/**
 * Suma el bono por las tandas que el usuario acertó.
 * `picks`: llaves donde el usuario predijo penales. `real`: llaves reales a penales.
 * Cada par (ronda + equipos) cuenta una sola vez.
 */
export function shootoutBonus(picks: ShootoutTie[], real: ShootoutTie[]): number {
  const realSet = new Set(real.map((r) => tieKey(r.round, r.teamA, r.teamB)))
  const counted = new Set<string>()
  let bonus = 0
  for (const p of picks) {
    const k = tieKey(p.round, p.teamA, p.teamB)
    if (realSet.has(k) && !counted.has(k)) {
      bonus += SHOOTOUT_BONUS
      counted.add(k)
    }
  }
  return bonus
}
