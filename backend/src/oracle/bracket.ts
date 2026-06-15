// Bracket del Pez Oráculo: a partir de las probabilidades por ronda del
// simulador Monte Carlo (frontend/src/sim), arma un cuadro coherente y lo
// persiste. La construcción es PURA y testeable; la simulación vive en el
// script offline seed-oracle-bracket.ts (pronóstico pre-torneo, semilla fija).

// Interfaz mínima de BD (igual contrato que oracle/lock.ts; se redefine aquí
// para evitar un import circular entre ambos módulos).
export type Queryable = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: any[] }>
}

// Subconjunto de SimResults.teams (frontend/src/sim/aggregate.ts) que usamos.
export type TeamRoundProbs = {
  team: string
  r16: number
  qf: number
  sf: number
  final: number
  champion: number
}

export type OracleBracket = {
  round16: string[] // 16
  quarter: string[] // 8
  semi: string[] // 4
  finalist: string[] // 2
  champion: string[] // 1
}

// Mismos pesos que el bracket de los usuarios (backend/src/routes/bracket.ts).
export const BRACKET_ROUND_POINTS: Record<string, number> = {
  round16: 1,
  quarter: 2,
  semi: 4,
  finalist: 6,
  champion: 10,
}

const ROUND_SLOTS: { round: keyof OracleBracket; key: keyof TeamRoundProbs; n: number }[] = [
  { round: 'round16', key: 'r16', n: 16 },
  { round: 'quarter', key: 'qf', n: 8 },
  { round: 'semi', key: 'sf', n: 4 },
  { round: 'finalist', key: 'final', n: 2 },
  { round: 'champion', key: 'champion', n: 1 },
]

// Top-N ANIDADO: cada ronda es subconjunto de la anterior. Garantiza un cuadro
// coherente (un campeón siempre estuvo en semis, etc.) aunque las
// probabilidades por equipo no aniden perfectamente entre sí.
export function buildBracket(teams: TeamRoundProbs[]): OracleBracket {
  const out = {} as OracleBracket
  let pool: Set<string> | null = null
  for (const { round, key, n } of ROUND_SLOTS) {
    const picked = teams
      .filter((t) => !pool || pool.has(t.team))
      .slice()
      .sort((a, b) => (b[key] as number) - (a[key] as number) || a.team.localeCompare(b.team))
      .slice(0, n)
      .map((t) => t.team)
    out[round] = picked
    pool = new Set(picked)
  }
  return out
}

export async function ensureOracleBracketTable(db: Queryable): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS oracle_bracket (
      round TEXT NOT NULL,
      team TEXT NOT NULL,
      locked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (round, team)
    );
  `)
}

// Guarda el bracket del Oráculo. Por defecto NO sobreescribe uno existente
// (lock-once: el pronóstico se congela una vez). Con force=true reescribe.
// Devuelve el número de filas escritas, o -1 si se omitió por existir ya.
export async function saveOracleBracket(
  db: Queryable,
  bracket: OracleBracket,
  opts: { force?: boolean } = {},
): Promise<number> {
  await ensureOracleBracketTable(db)

  const { rows: existing } = await db.query('SELECT COUNT(*)::int AS n FROM oracle_bracket')
  if ((existing[0]?.n ?? 0) > 0 && !opts.force) return -1

  await db.query('DELETE FROM oracle_bracket')
  let n = 0
  for (const round of Object.keys(bracket) as (keyof OracleBracket)[]) {
    for (const team of bracket[round]) {
      await db.query(
        `INSERT INTO oracle_bracket (round, team, locked_at) VALUES ($1, $2, now())
         ON CONFLICT (round, team) DO NOTHING`,
        [round, team],
      )
      n++
    }
  }
  return n
}
