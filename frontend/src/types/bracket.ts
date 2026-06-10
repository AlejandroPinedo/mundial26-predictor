export type MatchScore = {
  home: number | null
  away: number | null
  homePen: number | null
  awayPen: number | null
}

export type BracketScores = Record<string, MatchScore>

export type ScorePayloadItem = {
  matchIndex: number
  home: number
  away: number
  homePen: number | null
  awayPen: number | null
}

export const ROUND_KEYS = ['round16', 'quarter', 'semi', 'finalist', 'champion'] as const
export type RoundKey = typeof ROUND_KEYS[number]
