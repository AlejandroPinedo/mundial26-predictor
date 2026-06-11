import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../api/client'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import Spinner from '../components/Spinner'
import { getFlag } from '../utils/flags'
import { getElo } from '../utils/ratings'
import { SQUADS, getSquadElo } from '../utils/squads'
import { parseTeamName } from '../utils/bracketStructure'
import { useSimulationWorker } from '../hooks/useSimulationWorker'
import type { ApiMatch, SimConfig } from '../sim/tournament'
import type { SimResults, TeamProbabilities } from '../sim/aggregate'
import type { UserInputs, UserBracket, PointsSummary } from '../sim/userScore'

const CACHE_KEY = 'sim-results-v2'
const ITERATION_OPTIONS = [1000, 5000, 10000]
const BRACKET_ROUNDS = ['round16', 'quarter', 'semi', 'finalist', 'champion'] as const

function pct(p: number): string {
  if (p >= 0.995) return '100%'
  if (p >= 0.1) return `${Math.round(p * 100)}%`
  if (p >= 0.01) return `${(p * 100).toFixed(1)}%`
  if (p > 0) return '<1%'
  return '—'
}

function Bar({ p, highlight = false }: { p: number; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-ink-950 h-2 rounded-full overflow-hidden border border-white/5 min-w-[36px]">
        <div
          className={`h-full rounded-full transition-all duration-500 ${highlight ? 'bg-gold' : 'bg-gradient-to-r from-ca via-gold to-mx'}`}
          style={{ width: `${Math.max(p > 0 ? 2 : 0, p * 100)}%` }}
        />
      </div>
      <span className="text-[10px] font-condensed font-bold text-gray-400 w-9 text-right tabular-nums">{pct(p)}</span>
    </div>
  )
}

// ── Vista: detalle por grupos ────────────────────────────────────
function GroupsView({ results, groups }: { results: SimResults; groups: Record<string, string[]> }) {
  const byTeam = useMemo(
    () => new Map(results.teams.map(t => [t.team, t])),
    [results]
  )
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
      {Object.entries(groups).sort().map(([letter, teams]) => (
        <div key={letter} className="bg-panel border border-white/8 rounded-2xl overflow-hidden">
          <div className="tri-stripe" />
          <div className="p-4">
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-display text-2xl text-gold leading-none">{letter}</span>
              <span className="text-[9px] font-condensed font-black uppercase tracking-[0.18em] text-gray-500">Grupo</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {[...teams]
                .sort((a, b) => {
                  const ta = byTeam.get(a), tb = byTeam.get(b)
                  return (tb ? 1 - tb.eliminated : 0) - (ta ? 1 - ta.eliminated : 0)
                })
                .map(team => {
                  const t = byTeam.get(team)
                  if (!t) return null
                  return (
                    <div key={team}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="flex items-center gap-1.5 text-[11px] font-condensed font-bold uppercase tracking-wide text-gray-300 truncate">
                          <span className="no-invert">{getFlag(team)}</span> {team}
                        </span>
                        <span className="text-[10px] font-condensed font-bold text-gray-500 tabular-nums">
                          clasifica {pct(1 - t.eliminated)}
                        </span>
                      </div>
                      <div className="flex h-2 rounded-full overflow-hidden bg-ink-950 border border-white/5">
                        <div className="bg-gold h-full" style={{ width: `${t.winGroup * 100}%` }} title={`1º: ${pct(t.winGroup)}`} />
                        <div className="bg-mx h-full" style={{ width: `${t.second * 100}%` }} title={`2º: ${pct(t.second)}`} />
                        <div className="bg-us h-full" style={{ width: `${t.thirdQualified * 100}%` }} title={`3º clasificado: ${pct(t.thirdQualified)}`} />
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      ))}
      <div className="md:col-span-2 lg:col-span-3 flex items-center gap-4 text-[10px] font-condensed font-bold uppercase tracking-wide text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gold inline-block" /> 1º del grupo</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-mx inline-block" /> 2º</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-us inline-block" /> Mejor tercero</span>
      </div>
    </div>
  )
}

// ── Vista: finales más probables ─────────────────────────────────
function FinalsView({ results }: { results: SimResults }) {
  if (results.topFinals.length === 0) return null
  return (
    <div className="flex flex-col gap-3">
      {results.topFinals.map((f, i) => (
        <div key={`${f.teamA}-${f.teamB}`}
          className={`relative overflow-hidden bg-panel border rounded-2xl p-4 ${i === 0 ? 'border-gold/30' : 'border-white/8'}`}>
          {i === 0 && <div className="tri-stripe absolute top-0 left-0 right-0" />}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-display text-lg text-gray-600 w-6 text-center">{i + 1}</span>
            <div className="flex-1 flex items-center justify-center gap-3 min-w-[220px]">
              <span className="flex items-center gap-2 font-condensed font-extrabold uppercase tracking-wide text-sm text-white">
                <span className="no-invert text-2xl">{getFlag(f.teamA)}</span> {f.teamA}
              </span>
              <span className="scoreboard px-2.5 py-1 rounded-lg text-xs">VS</span>
              <span className="flex items-center gap-2 font-condensed font-extrabold uppercase tracking-wide text-sm text-white">
                {f.teamB} <span className="no-invert text-2xl">{getFlag(f.teamB)}</span>
              </span>
            </div>
            <div className="text-right">
              <p className={`font-display text-xl leading-none ${i === 0 ? 'text-gold' : 'text-gray-300'}`}>{pct(f.p)}</p>
              <p className="text-[9px] font-condensed font-bold uppercase tracking-[0.14em] text-gray-500 mt-0.5">de las simulaciones</p>
            </div>
          </div>
          <p className="text-center text-[10px] text-gray-500 mt-2 font-condensed font-bold uppercase tracking-wide">
            La gana <span className="text-mx">{f.teamA}</span> el {pct(f.aWinShare)} de las veces
          </p>
        </div>
      ))}
      <p className="text-[10px] text-gray-600 font-condensed uppercase tracking-wide">
        El resto de finales reparte el {pct(Math.max(0, 1 - results.topFinals.reduce((s, f) => s + f.p, 0)))} restante.
      </p>
    </div>
  )
}

// ── Vista: tus puntos esperados ──────────────────────────────────
function PointsView({ summary }: { summary: PointsSummary }) {
  const maxCount = Math.max(...summary.histogram.map(h => h.count))
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Puntos esperados', value: Math.round(summary.expectedTotal), color: 'text-gold', big: true },
          { label: 'Ya ganados', value: summary.basePoints, color: 'text-white' },
          { label: 'Esperado grupos', value: `+${summary.expectedGroup.toFixed(1)}`, color: 'text-mx' },
          { label: 'Esperado bracket', value: `+${summary.expectedBracket.toFixed(1)}`, color: 'text-us' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-panel border border-white/8 rounded-2xl p-4 text-center hover-lift">
            <p className={`font-display text-3xl leading-none ${color}`}>{value}</p>
            <p className="text-[9px] font-condensed font-black uppercase tracking-[0.16em] text-gray-500 mt-2">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-panel border border-white/8 rounded-2xl p-5 relative overflow-hidden">
        <div className="tri-stripe absolute top-0 left-0 right-0" />
        <p className="text-[10px] font-condensed font-black uppercase tracking-[0.18em] text-gray-400 mb-4">
          Distribución de tu puntaje final · escenario pesimista (p5) {summary.p5} pts · mediana {summary.p50} · optimista (p95) {summary.p95}
        </p>
        <div className="flex items-end gap-1 h-32">
          {summary.histogram.map(b => (
            <div key={b.from} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <div className="w-full bg-gradient-to-t from-ca via-gold to-mx rounded-t-sm transition-all duration-500"
                style={{ height: `${Math.max(2, (b.count / maxCount) * 100)}%` }} />
              <span className="text-[8px] text-gray-600 font-condensed truncate">{b.from}{b.to > b.from ? `–${b.to}` : ''}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-600 mt-3">
          Rango total observado: {summary.min}–{summary.max} pts · entre p25 ({summary.p25}) y p75 ({summary.p75}) cae la mitad de los escenarios.
        </p>
      </div>
    </div>
  )
}

export default function SimulatorPage() {
  const { run, cancel, running, progress, results, error, setResults } = useSimulationWorker()
  const [matches, setMatches] = useState<ApiMatch[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [myBracket, setMyBracket] = useState<UserBracket>({})
  const [myPreds, setMyPreds] = useState<{ match_id: string; predicted_home: number; predicted_away: number }[]>([])
  const [basePoints, setBasePoints] = useState(0)
  const [iterations, setIterations] = useState(5000)
  const [surprise, setSurprise] = useState(25)
  const [squadWeight, setSquadWeight] = useState(30)
  const [hostBoost, setHostBoost] = useState(true)
  const [momentum, setMomentum] = useState(true)
  const [seed, setSeed] = useState(() => Date.now() & 0xffffffff)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [tab, setTab] = useState<'teams' | 'groups' | 'finals' | 'points'>('teams')

  useEffect(() => {
    apiFetch('/predictions/matches')
      .then(d => setMatches(d.matches))
      .catch(() => setLoadError('No se pudieron cargar los partidos'))
    apiFetch('/bracket/my')
      .then(d => {
        const parsed: UserBracket = {}
        for (const round of BRACKET_ROUNDS) {
          const teams: (string | null)[] = d.predictions?.[round] ?? []
          parsed[round] = teams.map(t => parseTeamName(t))
        }
        setMyBracket(parsed)
      })
      .catch(() => {})
    apiFetch('/predictions/my')
      .then(d => {
        type MyPred = { match_id: string; predicted_home: number; predicted_away: number; points: number | null; home_score: number | null }
        const preds: MyPred[] = d.predictions ?? []
        setBasePoints(preds.reduce((s, p) => s + (p.points ?? 0), 0))
        setMyPreds(preds.filter(p => p.home_score === null)
          .map(p => ({ match_id: p.match_id, predicted_home: p.predicted_home, predicted_away: p.predicted_away })))
      })
      .catch(() => {})
    try {
      const cached = sessionStorage.getItem(CACHE_KEY)
      if (cached) setResults(JSON.parse(cached) as SimResults)
    } catch { /* cache corrupta: se ignora */ }
  }, [setResults])

  useEffect(() => {
    if (results) {
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(results)) } catch { /* sin espacio */ }
    }
  }, [results])

  const groups = useMemo(() => {
    if (!matches) return {}
    const g: Record<string, string[]> = {}
    for (const m of matches) {
      if (!/^[A-L]$/.test(m.group_name)) continue
      if (!g[m.group_name]) g[m.group_name] = []
      for (const t of [m.home_team, m.away_team]) {
        if (!g[m.group_name].includes(t)) g[m.group_name].push(t)
      }
    }
    return g
  }, [matches])

  const startRun = () => {
    if (!matches) return
    const config: SimConfig = { iterations, surprise, squadWeight, hostBoost, momentum, seed }
    const user: UserInputs = { predictions: myPreds, bracket: myBracket, basePoints }
    run(matches, config, user)
  }

  const myChampion = myBracket.champion?.[0] ?? null
  const top3 = results ? results.teams.slice(0, 3) : []
  const visibleTeams = results ? (showAll ? results.teams : results.teams.slice(0, 16)) : []
  const myChampionStats = results && myChampion ? results.teams.find(t => t.team === myChampion) : null
  const myChampionRank = myChampionStats && results ? results.teams.indexOf(myChampionStats) + 1 : null

  const TABS = [
    { key: 'teams' as const, label: 'Selecciones', icon: 'globe' as const },
    { key: 'groups' as const, label: 'Grupos', icon: 'medal' as const },
    { key: 'finals' as const, label: 'Finales', icon: 'trophy' as const },
    { key: 'points' as const, label: 'Mis puntos', icon: 'target' as const },
  ]

  return (
    <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 md:px-8 py-6 font-sans text-white">
      <PageHeader
        title="SIMULADOR"
        subtitle="Miles de mundiales simulados en tu navegador · Modelo Elo + Poisson por Montecarlo"
        badge="MONTE CARLO"
        icon="🎲"
      />

      {/* Panel de control */}
      <div className="glass rounded-2xl p-5 mb-6 fade-up-1">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-5">

          <div>
            <p className="text-[10px] font-condensed font-extrabold uppercase tracking-[0.18em] text-gray-400 mb-2">Simulaciones</p>
            <div className="flex gap-2">
              {ITERATION_OPTIONS.map(n => (
                <button key={n} onClick={() => setIterations(n)} disabled={running}
                  className={`chip cursor-pointer transition ${iterations === n ? 'border-gold/40 bg-gold/10 text-gold' : 'text-gray-400 hover:border-white/25'}`}>
                  {n.toLocaleString('es')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-condensed font-extrabold uppercase tracking-[0.18em] text-gray-400 mb-2">
              Factor sorpresa <span className="text-gold">{surprise}</span>
            </p>
            <input type="range" min={0} max={100} value={surprise} disabled={running}
              onChange={e => setSurprise(Number(e.target.value))}
              className="w-full accent-[#FFC300]" />
            <div className="flex justify-between text-[9px] text-gray-600 font-condensed font-bold uppercase tracking-wide">
              <span>Según el ranking</span><span>Todo puede pasar</span>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-condensed font-extrabold uppercase tracking-[0.18em] text-gray-400 mb-2">
              Peso plantilla <span className="text-gold">{squadWeight}%</span>
            </p>
            <input type="range" min={0} max={100} value={squadWeight} disabled={running}
              onChange={e => setSquadWeight(Number(e.target.value))}
              className="w-full accent-[#FFC300]" />
            <div className="flex justify-between text-[9px] text-gray-600 font-condensed font-bold uppercase tracking-wide">
              <span>Historial selección</span><span>Calidad del plantel</span>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-condensed font-extrabold uppercase tracking-[0.18em] text-gray-400 mb-2">Ventaja anfitrión</p>
            <button onClick={() => setHostBoost(v => !v)} disabled={running}
              className={`chip cursor-pointer transition ${hostBoost ? 'border-mx/40 bg-mx/10 text-mx' : 'text-gray-500'}`}>
              <span className="no-invert">🇲🇽🇺🇸🇨🇦</span> {hostBoost ? '+100 Elo' : 'Desactivada'}
            </button>
          </div>

          <div>
            <p className="text-[10px] font-condensed font-extrabold uppercase tracking-[0.18em] text-gray-400 mb-2">Momentum</p>
            <button onClick={() => setMomentum(v => !v)} disabled={running}
              className={`chip cursor-pointer transition ${momentum ? 'border-ca/40 bg-ca/10 text-ca' : 'text-gray-500'}`}>
              <Icon name="flame" size={11} /> {momentum ? 'Rachas activas' : 'Sin rachas'}
            </button>
            <p className="text-[9px] text-gray-600 mt-1.5 leading-snug">El Elo se ajusta partido a partido en cada mundial</p>
          </div>
        </div>

        <div className="mt-4">
          <button onClick={() => setShowAdvanced(v => !v)}
            className="text-[10px] font-condensed font-extrabold uppercase tracking-[0.18em] text-gray-500 hover:text-gray-300 cursor-pointer flex items-center gap-1">
            <Icon name={showAdvanced ? 'chevronLeft' : 'chevronRight'} size={11} /> Avanzado
          </button>
          {showAdvanced && (
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <label className="text-[10px] font-condensed font-extrabold uppercase tracking-[0.18em] text-gray-400">Semilla</label>
              <input type="number" value={seed} disabled={running}
                onChange={e => setSeed(Number(e.target.value) >>> 0)}
                className="bg-ink-950 border border-white/10 focus:border-gold/40 text-gold text-sm px-3 py-1.5 rounded-lg outline-none w-44 font-condensed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
              <button onClick={() => setSeed(Date.now() & 0xffffffff)} disabled={running}
                className="chip text-gray-400 hover:border-white/25 cursor-pointer">Nueva</button>
              <span className="text-[10px] text-gray-600">Misma semilla + misma config = mismos resultados</span>
            </div>
          )}
        </div>

        <div className="divider-gold my-4" />

        {running ? (
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-ink-950 h-3 rounded-full overflow-hidden border border-white/5">
              <div className="h-full rounded-full bg-gradient-to-r from-ca via-gold to-mx transition-all duration-200"
                style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <span className="font-display text-gold text-lg tabular-nums">{Math.round(progress * 100)}%</span>
            <button onClick={cancel} className="btn-ghost text-xs">Cancelar</button>
          </div>
        ) : (
          <div className="flex items-center gap-4 flex-wrap">
            <button onClick={startRun} disabled={!matches} className="btn-gold text-sm">
              <Icon name="zap" size={15} /> Simular {iterations.toLocaleString('es')} mundiales
            </button>
            {loadError && <span className="text-ca text-xs font-bold">{loadError}</span>}
            {error && <span className="text-ca text-xs font-bold">Error: {error}</span>}
            {!matches && !loadError && <Spinner />}
          </div>
        )}
      </div>

      {results && (
        <>
          {/* Podio de favoritos */}
          <div className="grid grid-cols-3 gap-3 mb-6 fade-up-2">
            {[top3[1], top3[0], top3[2]].filter(Boolean).map((t, i) => {
              const isFirst = i === 1
              return (
                <div key={t.team}
                  className={`relative overflow-hidden bg-panel border rounded-2xl p-4 text-center ${
                    isFirst ? 'border-gold/40 shadow-[0_8px_32px_-8px_rgba(255,195,0,0.3)] md:-translate-y-2' : 'border-white/8'
                  }`}>
                  {isFirst && <div className="tri-stripe absolute top-0 left-0 right-0" />}
                  {isFirst && <Icon name="crown" size={18} className="text-gold mx-auto mb-1" />}
                  <p className={`no-invert ${isFirst ? 'text-4xl' : 'text-3xl'} mb-1`}>{getFlag(t.team)}</p>
                  <p className="font-condensed font-extrabold uppercase tracking-wide text-xs text-gray-300 truncate">{t.team}</p>
                  <p className={`font-display leading-none mt-1.5 ${isFirst ? 'text-4xl trophy-text' : 'text-2xl text-gray-300'}`}>
                    {pct(t.champion)}
                  </p>
                  <p className="text-[9px] font-condensed font-bold uppercase tracking-[0.18em] text-gray-600 mt-1">Campeón</p>
                </div>
              )
            })}
          </div>

          {/* Tu campeón */}
          {myChampionStats && myChampionRank && (
            <div className="ticket-card rounded-2xl p-4 mb-6 fade-up-2 border-gold/30">
              <div className="relative z-10 flex items-center gap-3 flex-wrap">
                <span className="no-invert text-2xl">{getFlag(myChampionStats.team)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-condensed font-extrabold uppercase tracking-[0.18em] text-gold">Tu campeón del bracket</p>
                  <p className="font-display text-lg text-white uppercase truncate">{myChampionStats.team}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl text-gold leading-none">{pct(myChampionStats.champion)}</p>
                  <p className="text-[10px] text-gray-500 font-condensed font-bold uppercase tracking-wide">#{myChampionRank} de 48</p>
                </div>
              </div>
            </div>
          )}

          {/* Pestañas de resultados */}
          <div className="flex gap-2 mb-4 fade-up-3 overflow-x-auto">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`chip cursor-pointer transition flex-shrink-0 ${
                  tab === t.key ? 'border-gold/40 bg-gold/10 text-gold' : 'text-gray-400 hover:border-white/25'
                }`}>
                <Icon name={t.icon} size={11} /> {t.label}
              </button>
            ))}
          </div>

          {tab === 'groups' && <GroupsView results={results} groups={groups} />}
          {tab === 'finals' && <FinalsView results={results} />}
          {tab === 'points' && (
            results.myPoints ? <PointsView summary={results.myPoints} /> : (
              <div className="bg-panel border border-white/8 rounded-2xl p-8 text-center">
                <Icon name="target" size={32} className="text-gray-600 mx-auto mb-3" />
                <p className="font-display text-lg uppercase tracking-wide text-gray-300">Sin predicciones que simular</p>
                <p className="text-gray-500 text-sm mt-2">Haz tus predicciones y llena tu bracket; la próxima corrida calculará tus puntos esperados.</p>
              </div>
            )
          )}

          {tab === 'teams' && (
            <div className="bg-panel border border-white/8 rounded-2xl overflow-hidden">
              <div className="tri-stripe" />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[9px] font-condensed font-black uppercase tracking-[0.18em] text-gray-500 border-b border-white/6">
                      <th className="text-left px-4 py-3">Selección</th>
                      <th className="text-left px-3 py-3 hidden lg:table-cell">1º Grupo</th>
                      <th className="text-left px-3 py-3 hidden md:table-cell">32avos</th>
                      <th className="text-left px-3 py-3 hidden md:table-cell">16avos</th>
                      <th className="text-left px-3 py-3 hidden lg:table-cell">4tos</th>
                      <th className="text-left px-3 py-3">Semis</th>
                      <th className="text-left px-3 py-3 hidden md:table-cell">Final</th>
                      <th className="text-left px-3 py-3">Campeón</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleTeams.map((t: TeamProbabilities, idx: number) => {
                      const isMine = t.team === myChampion
                      const isOpen = expanded === t.team
                      const squad = SQUADS[t.team]
                      return (
                        <>
                          <tr key={t.team}
                            onClick={() => setExpanded(isOpen ? null : t.team)}
                            className={`border-b border-white/4 cursor-pointer transition hover:bg-white/[0.03] ${isMine ? 'bg-gold/5' : ''}`}>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2.5 min-w-[150px]">
                                <span className="font-display text-xs text-gray-600 w-5 text-right">{idx + 1}</span>
                                <span className="no-invert text-lg">{getFlag(t.team)}</span>
                                <span className={`font-condensed font-bold uppercase tracking-wide text-xs truncate ${isMine ? 'text-gold' : 'text-gray-200'}`}>
                                  {t.team}
                                </span>
                                {isMine && <Icon name="target" size={12} className="text-gold flex-shrink-0" />}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 hidden lg:table-cell min-w-[90px]"><Bar p={t.winGroup} /></td>
                            <td className="px-3 py-2.5 hidden md:table-cell min-w-[90px]"><Bar p={t.r32} /></td>
                            <td className="px-3 py-2.5 hidden md:table-cell min-w-[90px]"><Bar p={t.r16} /></td>
                            <td className="px-3 py-2.5 hidden lg:table-cell min-w-[90px]"><Bar p={t.qf} /></td>
                            <td className="px-3 py-2.5 min-w-[90px]"><Bar p={t.sf} /></td>
                            <td className="px-3 py-2.5 hidden md:table-cell min-w-[90px]"><Bar p={t.final} /></td>
                            <td className="px-3 py-2.5 min-w-[90px]"><Bar p={t.champion} highlight /></td>
                          </tr>
                          {isOpen && (
                            <tr key={`${t.team}-detail`} className="border-b border-white/4 bg-ink-900/60">
                              <td colSpan={8} className="px-4 py-3">
                                <div className="flex items-center gap-6 flex-wrap text-xs">
                                  <span className="chip text-us border-us/25 bg-us/10">Elo selección: {getElo(t.team)}</span>
                                  <span className="chip text-mx border-mx/25 bg-mx/10">Elo plantilla: {Math.round(getSquadElo(t.team).elo)}</span>
                                  {squad && (
                                    <span className="text-gray-400">
                                      <span className="text-gray-600 font-condensed font-bold uppercase tracking-wide text-[10px] mr-2">Figuras:</span>
                                      {squad.stars.join(' · ')}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {results.teams.length > 16 && (
                <button onClick={() => setShowAll(v => !v)}
                  className="w-full py-3 text-[10px] font-condensed font-extrabold uppercase tracking-[0.18em] text-gray-500 hover:text-gold transition cursor-pointer border-t border-white/6">
                  {showAll ? 'Ver menos' : `Ver las ${results.teams.length} selecciones`}
                </button>
              )}
            </div>
          )}

          {/* Nota metodológica */}
          <p className="text-[11px] text-gray-600 mt-4 leading-relaxed fade-up-4">
            Modelo: goles por Poisson (~2.6/partido) con probabilidades Elo — ratings de selección de
            eloratings.net y de plantilla por valor de mercado (Transfermarkt, escala log).
            {' '}{results.iterations.toLocaleString('es')} iteraciones en {results.elapsedMs.toLocaleString('es')} ms.
            Los partidos ya jugados quedan fijos con su resultado real y alimentan el momentum.
            {results.degenerateIterations > 0 && ` ${results.degenerateIterations} iteraciones usaron asignación relajada de terceros.`}
            {results.warnings.length > 0 && ` Avisos: ${results.warnings.join('; ')}.`}
          </p>
        </>
      )}

      {!results && !running && matches && (
        <div className="bg-panel border border-white/8 rounded-2xl p-10 text-center fade-up-2 relative overflow-hidden">
          <span className="wm-26 left-1/2 -translate-x-1/2 -top-6" aria-hidden="true">26</span>
          <Icon name="zap" size={40} className="text-gold/40 mx-auto mb-3" />
          <p className="font-display text-xl uppercase tracking-wide text-gray-300">¿Quién levanta la copa?</p>
          <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">
            Ajusta las variables y corre miles de mundiales simulados: probabilidades por selección y por grupo,
            las finales más probables y la proyección de tus propios puntos.
          </p>
        </div>
      )}
    </div>
  )
}
