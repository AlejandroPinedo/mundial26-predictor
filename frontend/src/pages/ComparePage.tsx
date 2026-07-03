import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiFetch } from '../api/client'
import Spinner from '../components/Spinner'
import Flag from '../components/Flag'
import { getPointsBadge } from '../utils/points'
import { LIMA_TZ } from '../utils/dates'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { parseTeamName, R32_TO_R16_SLOT } from '../utils/bracketStructure'

// Rondas del bracket (equipos que cada usuario predijo que ALCANZAN esa instancia).
const BRACKET_ROUNDS = [
  { key: 'round16', label: 'Octavos', pts: 1 },
  { key: 'quarter', label: 'Cuartos', pts: 2 },
  { key: 'semi', label: 'Semifinal', pts: 4 },
  { key: 'finalist', label: 'Final', pts: 6 },
  { key: 'champion', label: 'Campeón', pts: 10 },
] as const

type BracketPreds = Record<string, string[]>

type KoScore = { home: number | null; away: number | null; homePen: number | null; awayPen: number | null }

// Sección (ronda de avance) → ronda de bracket_predictions que guarda el marcador de
// ESE partido, y su stage real. round16=octavos … campeón=final (el marcador del
// campeón es el del partido de la final, en el bundle 'finalist').
const SCORE_ROUND: Record<string, string> = { round16: 'round16', quarter: 'quarter', semi: 'semi', finalist: 'finalist', champion: 'finalist' }
const STAGE_FOR: Record<string, string> = { round16: 'Octavos', quarter: 'Cuartos', semi: 'Semifinales', finalist: 'Final', champion: 'Final' }
// Ronda PREVIA: el partido por el que el equipo CLASIFICÓ a esta instancia (es el que
// valida el pick; para round16 son los 16avos, ya culminados en su mayoría).
const PREV_STAGE_FOR: Record<string, string> = { round16: 'Dieciseisavos', quarter: 'Octavos', semi: 'Cuartos', finalist: 'Semifinales', champion: 'Final' }
const ROUND_LABEL: Record<string, string> = { round16: 'Octavos', quarter: 'Cuartos', semi: 'Semifinal', finalist: 'Final', champion: 'Final' }
const STAGE_LABEL: Record<string, string> = { Dieciseisavos: '16avos', Octavos: 'Octavos', Cuartos: 'Cuartos', Semifinales: 'Semifinal', Final: 'Final' }

// Marcador ORIENTADO al equipo clickeado. Los scores guardados (home/away) siguen el
// orden de los slots del bracket de CADA usuario (y los legados, un orden que ya no es
// reconstruible), así que la orientación se deriva de forma robusta por LADO GANADOR:
// si el equipo avanza en el bracket de ese usuario, sus goles son los del lado ganador.
// El rival predicho sale del pick "hermano" en la estructura oficial (slot de 16avos).
type Oriented = { tg: number; og: number; tp: number | null; op: number | null; partner: string | null }

const NEXT_ROUND: Record<string, string | null> = { round16: 'quarter', quarter: 'semi', semi: 'finalist', finalist: 'champion', champion: null }
// Tamaño del grupo de slots de 16avos que alimenta UN participante de la ronda.
const SLOT_SPAN: Record<string, number> = { round16: 1, quarter: 2, semi: 4, finalist: 8, champion: 8 }

const orientScore = (
  raw: KoScore | null | undefined,
  round: string,
  team: string,
  bracket: BracketPreds,
  slotOf: Record<string, number>,
): Oriented | null => {
  if (!raw || raw.home == null || raw.away == null) return null
  const nxt = NEXT_ROUND[round]
  // ¿El equipo gana este partido según el bracket de este usuario? (campeón: ganó la final)
  const adv = nxt == null ? true : (bracket[nxt] ?? []).includes(team)
  const [wG, lG] = raw.home >= raw.away ? [raw.home, raw.away] : [raw.away, raw.home]
  let tp: number | null = null
  let op: number | null = null
  if (raw.home === raw.away && raw.homePen != null && raw.awayPen != null) {
    const [wP, lP] = raw.homePen >= raw.awayPen ? [raw.homePen, raw.awayPen] : [raw.awayPen, raw.homePen]
    tp = adv ? wP : lP
    op = adv ? lP : wP
  }
  const span = SLOT_SPAN[round]
  const s = slotOf[team]
  let partner: string | null = null
  if (s != null && span != null) {
    const sr = round === 'champion' ? 'finalist' : round
    const idx = Math.floor(s / span)
    partner = (bracket[sr] ?? []).find(
      (t) => t !== team && slotOf[t] != null && Math.floor(slotOf[t] / span) === (idx ^ 1),
    ) ?? null
  }
  return { tg: adv ? wG : lG, og: adv ? lG : wG, tp, op, partner }
}

// +2 si el marcador orientado coincide EXACTO con el real (mismo rival, mismos goles
// por equipo; si el real fue a penales, también la tanda por equipo).
const exactVsReal = (
  o: Oriented | null,
  real: ({ homeTeam: string; awayTeam: string } & KoScore) | null,
  team: string,
): boolean => {
  if (!o || !real || real.home == null || real.away == null) return false
  const teamIsHome = real.homeTeam === team
  const realOpp = teamIsHome ? real.awayTeam : real.homeTeam
  if (o.partner && o.partner !== realOpp) return false // predijo otro cruce
  const rtg = teamIsHome ? real.home : real.away
  const rog = teamIsHome ? real.away : real.home
  if (o.tg !== rtg || o.og !== rog) return false
  if (rtg === rog) {
    const rtp = teamIsHome ? real.homePen : real.awayPen
    const rop = teamIsHome ? real.awayPen : real.homePen
    if (rtp == null || rop == null) return false
    return o.tp === rtp && o.op === rop
  }
  return true
}

const fmtOriented = (team: string, o: Oriented | null) =>
  o ? `${team} ${o.tg}-${o.og}${o.tp != null ? ` (${o.tp}-${o.op} pen)` : ''}${o.partner ? ` ${o.partner}` : ''}` : '—'

// Ganador de un partido real (mayor marcador; empate → penales). null si indeciso.
const winnerOf = (m: { homeTeam: string; awayTeam: string } & KoScore): string | null => {
  if (m.home == null || m.away == null) return null
  if (m.home > m.away) return m.homeTeam
  if (m.away > m.home) return m.awayTeam
  if (m.homePen == null || m.awayPen == null || m.homePen === m.awayPen) return null
  return m.homePen > m.awayPen ? m.homeTeam : m.awayTeam
}

type Prediction = {
  id: string
  match_id: string
  home_team: string
  away_team: string
  match_date: string
  stage: string
  predicted_home: number
  predicted_away: number
  home_score: number | null
  away_score: number | null
  points: number | null
  stadium_name?: string
}

type ComparedMatch = {
  matchId: string
  homeTeam: string
  awayTeam: string
  matchDate: string
  stage: string
  homeScore: number | null
  awayScore: number | null
  stadiumName?: string
  myPred: { home: number; away: number; points: number | null } | null
  otherPred: { home: number; away: number; points: number | null } | null
}

export default function ComparePage() {
  const { username } = useParams<{ username: string }>()
  const [loading, setLoading] = useState(true)
  const [comparedMatches, setComparedMatches] = useState<ComparedMatch[]>([])
  const [filter, setFilter] = useState<'all' | 'played' | 'pending'>('all')
  const [myBracket, setMyBracket] = useState<BracketPreds>({})
  const [otherBracket, setOtherBracket] = useState<BracketPreds>({})
  const [bracketResults, setBracketResults] = useState<BracketPreds>({})
  // Marcador predicho por (ronda|equipo) de cada quien, y resultado real por (stage|equipo).
  const [myMS, setMyMS] = useState<Record<string, KoScore>>({})
  const [otherMS, setOtherMS] = useState<Record<string, KoScore>>({})
  const [realKo, setRealKo] = useState<Record<string, { homeTeam: string; awayTeam: string } & KoScore>>({})
  // Slot de 16avos (estructura oficial) de cada equipo KO — para hallar el rival predicho.
  const [r16SlotOf, setR16SlotOf] = useState<Record<string, number>>({})
  const [detail, setDetail] = useState<{ round: string; team: string } | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      apiFetch('/predictions/my'),
      apiFetch(`/predictions/user/${encodeURIComponent(username || '')}`),
      apiFetch('/bracket/my').catch(() => ({ predictions: {} })),
      apiFetch(`/bracket/user/${encodeURIComponent(username || '')}`).catch(() => ({ predictions: {} })),
      apiFetch('/bracket/results').catch(() => ({ results: {} })),
      apiFetch('/predictions/matches').catch(() => ({ matches: [] })),
    ])
      .then(([myData, otherData, myBr, otherBr, brRes, matchesData]) => {
        const myPredictions: Prediction[] = myData.predictions
        const otherPredictions: Prediction[] = otherData.predictions

        // Map predictions by match_id
        const myMap = new Map(myPredictions.map(p => [p.match_id, p]))
        const otherMap = new Map(otherPredictions.map(p => [p.match_id, p]))

        // Collect all match IDs
        const allMatchIds = Array.from(
          new Set([...myPredictions.map(p => p.match_id), ...otherPredictions.map(p => p.match_id)])
        )

        // Merge match predictions
        const merged: ComparedMatch[] = allMatchIds.map(matchId => {
          const m = myMap.get(matchId) || otherMap.get(matchId)
          if (!m) throw new Error('Missing match metadata')

          const my = myMap.get(matchId)
          const other = otherMap.get(matchId)

          return {
            matchId,
            homeTeam: m.home_team,
            awayTeam: m.away_team,
            matchDate: m.match_date,
            stage: m.stage,
            homeScore: m.home_score,
            awayScore: m.away_score,
            stadiumName: m.stadium_name,
            myPred: my ? { home: my.predicted_home, away: my.predicted_away, points: my.points } : null,
            otherPred: other ? { home: other.predicted_home, away: other.predicted_away, points: other.points } : null,
          }
        })

        // Sort by match date
        merged.sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime())

        setComparedMatches(merged)

        // Bracket (eliminatoria): normaliza el prefijo de slot y descarta vacíos.
        const norm = (obj: Record<string, string[]> = {}): BracketPreds => {
          const out: BracketPreds = {}
          for (const k of Object.keys(obj)) {
            out[k] = (obj[k] || []).map((t) => parseTeamName(t)).filter((t): t is string => !!t)
          }
          return out
        }
        setMyBracket(norm(myBr?.predictions))
        setOtherBracket(norm(otherBr?.predictions))
        setBracketResults(norm(brRes?.results))

        // Marcador predicho por (ronda|equipo) para el detalle al hacer click en un pick.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- filas de matchScores
        const msMap = (arr: any[] = []) => {
          const m: Record<string, KoScore> = {}
          for (const s of arr) m[`${s.round}|${s.team}`] = { home: s.home, away: s.away, homePen: s.homePen, awayPen: s.awayPen }
          return m
        }
        setMyMS(msMap(myBr?.matchScores))
        setOtherMS(msMap(otherBr?.matchScores))
        // Resultado REAL de los partidos KO, por (stage|equipo), para el detalle.
        const rk: Record<string, { homeTeam: string; awayTeam: string } & KoScore> = {}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shape de match
        for (const m of ((matchesData?.matches ?? []) as any[])) {
          if (m.home_score == null || /grupo|group/i.test(m.stage ?? '')) continue
          const rec = { homeTeam: m.home_team, awayTeam: m.away_team, home: m.home_score, away: m.away_score, homePen: m.home_pen, awayPen: m.away_pen }
          rk[`${m.stage}|${m.home_team}`] = rec
          rk[`${m.stage}|${m.away_team}`] = rec
        }
        setRealKo(rk)

        // Slot de 16avos por equipo (los cruces reales M73..M88 son fijos: grupos decididos).
        const so: Record<string, number> = {}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shape de match
        for (const m of ((matchesData?.matches ?? []) as any[])) {
          if (m.stage !== 'Dieciseisavos') continue
          const idx = Number(String(m.group_name).replace('M', '')) - 73
          if (idx >= 0 && idx < 16) {
            so[m.home_team] = R32_TO_R16_SLOT[idx]
            so[m.away_team] = R32_TO_R16_SLOT[idx]
          }
        }
        setR16SlotOf(so)
      })
      .catch(err => {
        console.error('Error fetching comparisons:', err)
      })
      .finally(() => setLoading(false))
  }, [username])

  // Direct comparison stats
  const played = comparedMatches.filter(m => m.homeScore !== null)
  const myTotalComparedPoints = played.reduce((sum, m) => sum + (m.myPred?.points ?? 0), 0)
  const otherTotalComparedPoints = played.reduce((sum, m) => sum + (m.otherPred?.points ?? 0), 0)

  let myWins = 0
  let otherWins = 0
  let ties = 0

  played.forEach(m => {
    const myPts = m.myPred?.points ?? 0
    const otherPts = m.otherPred?.points ?? 0
    if (myPts > otherPts) myWins++
    else if (otherPts > myPts) otherWins++
    else ties++
  })

  const filteredMatches = comparedMatches.filter(m => {
    if (filter === 'played') return m.homeScore !== null
    if (filter === 'pending') return m.homeScore === null
    return true
  })

  return (
    <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 md:px-8 py-6 font-sans">

      {/* Back navigation */}
      <Link
        to="/groups"
        className="inline-flex items-center gap-1.5 text-gold text-xs font-condensed font-extrabold uppercase tracking-[0.15em] hover:underline mb-6"
        id="back-to-groups-compare-btn"
      >
        <Icon name="chevronLeft" size={14} strokeWidth={2.6} />
        Volver a Grupos
      </Link>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : (
        <>
          <PageHeader title="COMPARADOR" subtitle={`Predicciones cara a cara vs ${username}`} icon="⚔️" />

          {/* VS Hero: head to head */}
          <div className="ticket-card mb-8 fade-up-1">
            <span className="wm-26 -right-4 -bottom-10" aria-hidden="true">26</span>
            <div className="relative z-10 p-5 md:p-7 pl-4 md:pl-7">

              <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 md:gap-6">
                {/* My side (CA red) */}
                <div className="text-center min-w-0">
                  <p className="font-display text-2xl md:text-4xl text-ca uppercase leading-none truncate">Tú</p>
                  <div className="mt-3">
                    <span className="scoreboard inline-block px-3 py-1 rounded-lg text-xl md:text-2xl leading-none">
                      {myTotalComparedPoints}
                    </span>
                    <span className="block mt-1.5 text-[9px] font-condensed font-extrabold uppercase tracking-[0.18em] text-gray-500">
                      Tus puntos
                    </span>
                  </div>
                </div>

                {/* Center VS */}
                <div className="text-center pt-1 md:pt-2">
                  <span className="font-display text-lg md:text-2xl text-gray-600 select-none">VS</span>
                </div>

                {/* Other side (US blue) */}
                <div className="text-center min-w-0">
                  <p className="font-display text-2xl md:text-4xl text-us uppercase leading-none truncate">{username}</p>
                  <div className="mt-3">
                    <span className="scoreboard inline-block px-3 py-1 rounded-lg text-xl md:text-2xl leading-none">
                      {otherTotalComparedPoints}
                    </span>
                    <span className="block mt-1.5 text-[9px] font-condensed font-extrabold uppercase tracking-[0.18em] text-gray-500">
                      Puntos de {username}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pitch-divider mt-5 mb-4" />

              {/* Head-to-head record */}
              <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
                <span className="chip text-mx border-mx/25 bg-mx/10">{myWins} victorias directas</span>
                <span className="chip text-gold border-gold/25 bg-gold/10">{ties} empates</span>
                <span className="chip text-us border-us/25 bg-us/10">{otherWins} victorias de {username}</span>
              </div>
              <p className="text-center text-[10px] text-gray-500 mt-2.5 font-medium">
                Acumulado en partidos disputados
              </p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6 flex-wrap fade-up-2">
            {(
              [
                { code: 'all', label: 'Todos los partidos' },
                { code: 'played', label: `Jugados (${played.length})` },
                { code: 'pending', label: `Pendientes (${comparedMatches.length - played.length})` },
              ] as const
            ).map(({ code, label }) => (
              <button
                key={code}
                onClick={() => setFilter(code)}
                className={`px-4 py-2 rounded-xl text-[11px] font-condensed font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  filter === code
                    ? 'bg-gold text-ink-950 shadow-[0_4px_16px_-4px_rgba(255,195,0,0.5)]'
                    : 'bg-panel border border-white/8 text-gray-400 hover:text-white hover:border-white/20'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Matches List */}
          {filteredMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 fade-up-3">
              {filteredMatches.map(m => {
                const hasResult = m.homeScore !== null
                const myPts = m.myPred?.points
                const otherPts = m.otherPred?.points

                // Determine winner of this match comparison
                let outcome: 'win' | 'lose' | 'tie' | 'none' = 'none'
                if (hasResult) {
                  const myPointsVal = myPts ?? 0
                  const otherPointsVal = otherPts ?? 0
                  if (myPointsVal > otherPointsVal) outcome = 'win'
                  else if (otherPointsVal > myPointsVal) outcome = 'lose'
                  else outcome = 'tie'
                }

                return (
                  <div
                    key={m.matchId}
                    className={`bg-panel border rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden transition-all duration-300 ${
                      outcome === 'win'
                        ? 'border-mx/35 hover:border-mx/55'
                        : outcome === 'lose'
                        ? 'border-ca/35 hover:border-ca/55'
                        : outcome === 'tie'
                        ? 'border-gold/35 hover:border-gold/55'
                        : 'border-white/8 hover:border-white/15'
                    }`}
                  >
                    {/* Top metadata */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <span className="chip text-us border-us/20 bg-us/[0.08] self-start">{m.stage}</span>
                        {m.stadiumName && (
                          <span className="text-[10px] text-gray-500 flex items-center gap-1 font-medium">
                            <Icon name="stadium" size={11} />
                            {m.stadiumName}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className="text-[10px] text-gray-500 font-condensed font-extrabold uppercase tracking-wider flex items-center gap-1">
                          <Icon name="clock" size={11} />
                          {new Date(m.matchDate).toLocaleDateString('es', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: LIMA_TZ,
                          })}
                        </span>
                        {hasResult && (
                          <>
                            {outcome === 'win' && (
                              <span className="chip text-mx border-mx/30 bg-mx/10">¡Ganaste!</span>
                            )}
                            {outcome === 'lose' && (
                              <span className="chip text-ca border-ca/30 bg-ca/10">Perdiste</span>
                            )}
                            {outcome === 'tie' && (
                              <span className="chip text-gold border-gold/30 bg-gold/10">Empate</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Main Teams Match Score */}
                    <div className="flex justify-between items-center gap-2 font-condensed font-extrabold text-base md:text-lg tracking-wide py-1">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Flag team={m.homeTeam} className="h-4.5 flex-shrink-0" />
                        <span className="truncate uppercase text-white">{m.homeTeam}</span>
                      </div>

                      <div className="flex-shrink-0">
                        {hasResult ? (
                          <span className="scoreboard px-3 py-1 rounded-lg text-sm md:text-base leading-none">
                            {m.homeScore} - {m.awayScore}
                          </span>
                        ) : (
                          <span className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-gray-500 text-[10px] font-condensed font-extrabold uppercase tracking-[0.25em]">
                            VS
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                        <span className="truncate uppercase text-white">{m.awayTeam}</span>
                        <Flag team={m.awayTeam} className="h-4.5 flex-shrink-0" />
                      </div>
                    </div>

                    {/* Side-by-side Predictions */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
                      {/* My Prediction */}
                      <div
                        className={`p-3 rounded-xl border ${
                          outcome === 'win'
                            ? 'bg-mx/[0.05] border-mx/20'
                            : outcome === 'tie'
                            ? 'bg-gold/[0.04] border-gold/15'
                            : 'bg-ink-950/60 border-white/8'
                        }`}
                      >
                        <span className="text-[9px] text-ca font-condensed font-extrabold uppercase tracking-[0.15em] block mb-1.5">
                          Tu Predicción
                        </span>
                        {m.myPred ? (
                          <div className="flex flex-col gap-1.5">
                            <span className="font-display text-base text-white">
                              {m.myPred.home} - {m.myPred.away}
                            </span>
                            {hasResult && (
                              <span
                                className={`chip self-start ${
                                  myPts === 3
                                    ? 'text-gold border-gold/30 bg-gold/10'
                                    : myPts === 1
                                    ? 'text-mx border-mx/30 bg-mx/10'
                                    : 'text-gray-500'
                                }`}
                              >
                                {myPts} pts — {getPointsBadge(myPts ?? 0)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-600 font-bold italic">
                            Sin pred. <span className="no-invert">⚠️</span>
                          </span>
                        )}
                      </div>

                      {/* Other User Prediction */}
                      <div
                        className={`p-3 rounded-xl border ${
                          outcome === 'lose'
                            ? 'bg-ca/[0.05] border-ca/20'
                            : outcome === 'tie'
                            ? 'bg-gold/[0.04] border-gold/15'
                            : 'bg-ink-950/60 border-white/8'
                        }`}
                      >
                        <span className="text-[9px] text-us font-condensed font-extrabold uppercase tracking-[0.15em] block mb-1.5 truncate">
                          Pred. de {username}
                        </span>
                        {m.otherPred ? (
                          <div className="flex flex-col gap-1.5">
                            <span className="font-display text-base text-white">
                              {m.otherPred.home} - {m.otherPred.away}
                            </span>
                            {hasResult && (
                              <span
                                className={`chip self-start ${
                                  otherPts === 3
                                    ? 'text-gold border-gold/30 bg-gold/10'
                                    : otherPts === 1
                                    ? 'text-mx border-mx/30 bg-mx/10'
                                    : 'text-gray-500'
                                }`}
                              >
                                {otherPts} pts — {getPointsBadge(otherPts ?? 0)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-600 font-bold italic">
                            Sin pred. <span className="no-invert">⚠️</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-20 bg-panel border border-white/8 rounded-2xl fade-up-2">
              <Icon name="target" size={44} className="mx-auto text-gray-600 mb-4" />
              <h3 className="text-white font-condensed font-extrabold uppercase tracking-wide text-base mb-1">
                No hay partidos en esta categoría
              </h3>
              <p className="text-gray-400 text-sm">Prueba seleccionando una pestaña de filtro diferente.</p>
            </div>
          )}

          {/* Bracket / Eliminatoria: predicciones de avance cara a cara */}
          {BRACKET_ROUNDS.some(r => (myBracket[r.key]?.length || otherBracket[r.key]?.length)) && (
            <div className="mt-10 fade-up-3">
              <h2 className="font-display text-xl md:text-2xl text-white uppercase mb-1">Bracket · Eliminatoria</h2>
              <p className="text-[11px] text-gray-500 mb-5 font-medium">
                Equipos que cada quien predijo que avanzan. En <span className="text-mx">verde</span>, aciertos según los resultados.
                Toca un equipo para ver el marcador predicho de su partido.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {BRACKET_ROUNDS.map(r => {
                  const mine = myBracket[r.key] || []
                  const theirs = otherBracket[r.key] || []
                  if (!mine.length && !theirs.length) return null
                  const correct = new Set(bracketResults[r.key] || [])
                  const chips = (teams: string[]) =>
                    teams.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {teams.map(t => {
                          const ok = correct.has(t)
                          return (
                            <button
                              key={t}
                              onClick={() => setDetail({ round: r.key, team: t })}
                              title="Ver marcador predicho de este partido"
                              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium border cursor-pointer transition-colors hover:border-gold/45 ${
                                ok ? 'bg-mx/10 border-mx/30 text-mx' : 'bg-ink-950/60 border-white/8 text-gray-300'
                              }`}
                            >
                              <Flag team={t} className="h-3 flex-shrink-0" />
                              <span>{t}</span>
                              {ok && <span className="text-mx">✓</span>}
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-600 italic">Sin predicción</span>
                    )
                  return (
                    <div key={r.key} className="bg-panel border border-white/8 rounded-2xl p-4">
                      <div className="flex justify-between items-center mb-3">
                        <span className="chip text-us border-us/20 bg-us/[0.08]">{r.label}</span>
                        <span className="text-[10px] text-gray-500 font-condensed font-extrabold uppercase tracking-wider">
                          {r.pts} pts c/u
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-[9px] text-ca font-condensed font-extrabold uppercase tracking-[0.15em] block mb-1.5">Tú</span>
                          {chips(mine)}
                        </div>
                        <div>
                          <span className="text-[9px] text-us font-condensed font-extrabold uppercase tracking-[0.15em] block mb-1.5 truncate">
                            {username}
                          </span>
                          {chips(theirs)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Detalle de la predicción de un partido (al hacer click en un equipo del bracket) */}
          {detail && (() => {
            const sr = SCORE_ROUND[detail.round]
            const stage = STAGE_FOR[detail.round]
            const prevStage = PREV_STAGE_FOR[detail.round]
            // Marcadores ORIENTADOS al equipo clickeado (goles del equipo primero + rival predicho).
            const mineO = orientScore(myMS[`${sr}|${detail.team}`], detail.round, detail.team, myBracket, r16SlotOf)
            const theirsO = orientScore(otherMS[`${sr}|${detail.team}`], detail.round, detail.team, otherBracket, r16SlotOf)
            const real = realKo[`${stage}|${detail.team}`] ?? null
            // Partido por el que CLASIFICÓ (ronda previa, culminado en su mayoría).
            // Para 'champion' es la propia final (misma que `real`): no se duplica.
            const prev = prevStage !== stage ? (realKo[`${prevStage}|${detail.team}`] ?? null) : null
            const prevWinner = prev ? winnerOf(prev) : null
            const meExact = exactVsReal(mineO, real, detail.team)
            const themExact = exactVsReal(theirsO, real, detail.team)
            const fmtMatch = (m: { homeTeam: string; awayTeam: string } & KoScore) =>
              `${m.homeTeam} ${m.home}-${m.away} ${m.awayTeam}${m.home === m.away && m.homePen != null ? ` (${m.homePen}-${m.awayPen} pen)` : ''}`
            return (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setDetail(null)}>
                <div className="bg-panel border border-white/12 rounded-2xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-start justify-between mb-4 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Flag team={detail.team} className="h-5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-display text-white uppercase truncate">{detail.team}</p>
                        <p className="text-[10px] text-gray-500 font-condensed font-extrabold uppercase tracking-wider">
                          Pick de {ROUND_LABEL[detail.round]}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => setDetail(null)} className="text-gray-500 hover:text-white cursor-pointer text-lg leading-none">✕</button>
                  </div>

                  {/* Cómo clasificó: partido de la ronda previa (valida el pick) */}
                  {prev && (
                    <div className="mb-3 text-center">
                      <span className="text-[9px] text-gray-500 font-condensed font-extrabold uppercase tracking-[0.15em] block mb-1">
                        Clasificación · {STAGE_LABEL[prevStage] ?? prevStage}
                      </span>
                      <span className="scoreboard px-3 py-1 rounded-lg text-sm">{fmtMatch(prev)}</span>
                      {prevWinner && (
                        <span className={`block mt-1 text-[10px] font-condensed font-extrabold uppercase tracking-wider ${prevWinner === detail.team ? 'text-mx' : 'text-ca'}`}>
                          {prevWinner === detail.team ? '✓ Clasificó' : '✗ Eliminado'}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Partido de ESTA ronda: resultado real (si se jugó) + marcadores predichos */}
                  <div className="mb-1 text-center">
                    <span className="text-[9px] text-gray-500 font-condensed font-extrabold uppercase tracking-[0.15em] block mb-1">
                      Partido de {STAGE_LABEL[stage] ?? stage}
                    </span>
                    {real ? (
                      <span className="scoreboard px-3 py-1 rounded-lg text-base">{fmtMatch(real)}</span>
                    ) : (
                      <p className="text-[11px] text-gray-500 italic">Aún no se juega.</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className={`p-3 rounded-xl border text-center ${meExact ? 'bg-gold/[0.06] border-gold/25' : 'bg-ink-950/60 border-white/8'}`}>
                      <span className="text-[9px] text-ca font-condensed font-extrabold uppercase tracking-[0.15em] block mb-1">Tu marcador</span>
                      <span className="font-display text-white text-xs">{fmtOriented(detail.team, mineO)}</span>
                      {meExact && <span className="chip text-gold border-gold/30 bg-gold/10 ml-1">+2</span>}
                    </div>
                    <div className={`p-3 rounded-xl border text-center ${themExact ? 'bg-gold/[0.06] border-gold/25' : 'bg-ink-950/60 border-white/8'}`}>
                      <span className="text-[9px] text-us font-condensed font-extrabold uppercase tracking-[0.15em] block mb-1 truncate">{username}</span>
                      <span className="font-display text-white text-xs">{fmtOriented(detail.team, theirsO)}</span>
                      {themExact && <span className="chip text-gold border-gold/30 bg-gold/10 ml-1">+2</span>}
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-3 text-center">
                    Marcador exacto acertado = <span className="text-gold">+2</span> (se acredita al jugarse el partido).
                  </p>
                </div>
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}
