// Forma reciente DESCRIPTIVA por equipo, calculada de los partidos ya jugados.
// No alimenta la predicción (eso es el modelo v1); es análisis para la tarjeta.

export type Result = 'W' | 'D' | 'L'

export type TeamForm = {
  gf: number // promedio de goles a favor (últimos n)
  ga: number // promedio de goles en contra
  results: Result[] // últimos n resultados, de más antiguo a más reciente
  played: number
}

type FormMatch = {
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  match_date: string
}

// Mapa { equipo: forma } a partir de los partidos jugados (orden cronológico, últimos n).
export function computeForm(matches: FormMatch[], n = 5): Record<string, TeamForm> {
  const hist: Record<string, { gf: number; ga: number; r: Result }[]> = {}
  const add = (team: string, gf: number, ga: number) => {
    if (!hist[team]) hist[team] = []
    hist[team].push({ gf, ga, r: gf > ga ? 'W' : gf === ga ? 'D' : 'L' })
  }

  const played = matches
    .filter(m => m.home_score !== null && m.away_score !== null)
    .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())

  for (const m of played) {
    add(m.home_team, m.home_score!, m.away_score!)
    add(m.away_team, m.away_score!, m.home_score!)
  }

  const out: Record<string, TeamForm> = {}
  for (const team in hist) {
    const last = hist[team].slice(-n)
    out[team] = {
      gf: last.reduce((s, x) => s + x.gf, 0) / last.length,
      ga: last.reduce((s, x) => s + x.ga, 0) / last.length,
      results: last.map(x => x.r),
      played: last.length,
    }
  }
  return out
}
