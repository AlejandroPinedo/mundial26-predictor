export type TeamStats = {
  team: string
  mp: number
  w: number
  d: number
  l: number
  gf: number
  ga: number
  gd: number
  pts: number
}

type Match = {
  id: string
  home_team: string
  away_team: string
  group_name: string
  home_score: number | null
  away_score: number | null
}

type Prediction = {
  match_id: string
  predicted_home: number
  predicted_away: number
}

export function calculateGroupStandings(
  matches: Match[],
  predictions: Record<string, Prediction>
): Record<string, TeamStats[]> {
  const teamsData: Record<string, Record<string, TeamStats>> = {}

  // Initialize teams from matches
  for (const match of matches) {
    const g = match.group_name
    if (!teamsData[g]) teamsData[g] = {}
    if (!teamsData[g][match.home_team]) {
      teamsData[g][match.home_team] = { team: match.home_team, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 }
    }
    if (!teamsData[g][match.away_team]) {
      teamsData[g][match.away_team] = { team: match.away_team, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 }
    }
  }

  // Calculate stats
  for (const match of matches) {
    const g = match.group_name
    const pred = predictions[match.id]

    let homeScore: number | null = null
    let awayScore: number | null = null

    if (match.home_score !== null && match.away_score !== null) {
      homeScore = match.home_score
      awayScore = match.away_score
    } else if (pred !== undefined) {
      homeScore = pred.predicted_home
      awayScore = pred.predicted_away
    }

    if (homeScore !== null && awayScore !== null) {
      const home = teamsData[g][match.home_team]
      const away = teamsData[g][match.away_team]

      home.mp += 1
      away.mp += 1
      home.gf += homeScore
      home.ga += awayScore
      away.gf += awayScore
      away.ga += homeScore
      home.gd = home.gf - home.ga
      away.gd = away.gf - away.ga

      if (homeScore > awayScore) {
        home.w += 1
        home.pts += 3
        away.l += 1
      } else if (homeScore < awayScore) {
        away.w += 1
        away.pts += 3
        home.l += 1
      } else {
        home.d += 1
        away.d += 1
        home.pts += 1
        away.pts += 1
      }
    }
  }

  // Sort groups
  const standings: Record<string, TeamStats[]> = {}
  for (const [group, teamsMap] of Object.entries(teamsData)) {
    standings[group] = Object.values(teamsMap).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts
      if (b.gd !== a.gd) return b.gd - a.gd
      if (b.gf !== a.gf) return b.gf - a.gf
      if (b.w !== a.w) return b.w - a.w
      return a.team.localeCompare(b.team)
    })
  }

  return standings
}

export type ThirdPlaceStats = TeamStats & { group: string }

export function getBestThirdPlacedTeams(
  standings: Record<string, TeamStats[]>
): ThirdPlaceStats[] {
  const thirds: ThirdPlaceStats[] = []
  for (const [group, teams] of Object.entries(standings)) {
    if (teams[2]) {
      thirds.push({ ...teams[2], group })
    }
  }

  return thirds.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts
    if (b.gd !== a.gd) return b.gd - a.gd
    if (b.gf !== a.gf) return b.gf - a.gf
    if (b.w !== a.w) return b.w - a.w
    return a.team.localeCompare(b.team)
  })
}

// Bipartite matching / backtracking to map group winners to third-placed teams
export function allocateThirds(qualifiedGroups: string[]): Record<string, string> | null {
  const pools: Record<string, string[]> = {
    E: ['A', 'B', 'C', 'D', 'F'],
    I: ['C', 'D', 'F', 'G', 'H'],
    A: ['C', 'E', 'F', 'H', 'I'],
    L: ['E', 'H', 'I', 'J', 'K'],
    G: ['A', 'E', 'H', 'I', 'J'],
    D: ['B', 'E', 'F', 'I', 'J'],
    B: ['E', 'F', 'G', 'I', 'J'],
    K: ['D', 'E', 'I', 'J', 'L']
  }
  const winners = Object.keys(pools)
  const assignment: Record<string, string> = {}
  const used = new Set<string>()

  function backtrack(index: number): boolean {
    if (index === winners.length) return true
    const w = winners[index]
    for (const g of pools[w]) {
      if (qualifiedGroups.includes(g) && !used.has(g)) {
        assignment[w] = g
        used.add(g)
        if (backtrack(index + 1)) return true
        used.delete(g)
        delete assignment[w]
      }
    }
    return false
  }

  if (backtrack(0)) return assignment
  return null
}

export type R32Matchup = {
  home: string
  away: string
  label: string
}

export function calculateRoundOf32(
  matches: Match[],
  predictions: Record<string, Prediction>
): R32Matchup[] {
  const standings = calculateGroupStandings(matches, predictions)
  const thirds = getBestThirdPlacedTeams(standings)
  const bestThirdGroups = thirds.slice(0, 8).map(t => t.group)
  const thirdAlloc = allocateThirds(bestThirdGroups) || {}

  const getWinner = (g: string) => standings[g]?.[0]?.team || `Ganador Grupo ${g}`
  const getRunnerUp = (g: string) => standings[g]?.[1]?.team || `Segundo Grupo ${g}`
  const getThird = (g: string) => standings[g]?.[2]?.team || `Tercero Grupo ${g}`
  
  const getThirdForWinner = (winnerGroup: string) => {
    const targetGroup = thirdAlloc[winnerGroup]
    return targetGroup ? getThird(targetGroup) : `3ro Grupo ${winnerGroup}`
  }

  // Official FIFA World Cup 2026 Round of 32 Matchups
  return [
    { home: getRunnerUp('A'), away: getRunnerUp('B'), label: 'M73: 2A vs 2B' },
    { home: getWinner('E'), away: getThirdForWinner('E'), label: 'M74: 1E vs 3A/B/C/D/F' },
    { home: getWinner('F'), away: getRunnerUp('C'), label: 'M75: 1F vs 2C' },
    { home: getWinner('C'), away: getRunnerUp('F'), label: 'M76: 1C vs 2F' },
    { home: getWinner('I'), away: getThirdForWinner('I'), label: 'M77: 1I vs 3C/D/F/G/H' },
    { home: getRunnerUp('E'), away: getRunnerUp('I'), label: 'M78: 2E vs 2I' },
    { home: getWinner('A'), away: getThirdForWinner('A'), label: 'M79: 1A vs 3C/E/F/H/I' },
    { home: getWinner('L'), away: getThirdForWinner('L'), label: 'M80: 1L vs 3E/H/I/J/K' },
    { home: getWinner('G'), away: getThirdForWinner('G'), label: 'M81: 1G vs 3A/E/H/I/J' },
    { home: getWinner('D'), away: getThirdForWinner('D'), label: 'M82: 1D vs 3B/E/F/I/J' },
    { home: getWinner('H'), away: getRunnerUp('J'), label: 'M83: 1H vs 2J' },
    { home: getRunnerUp('K'), away: getRunnerUp('L'), label: 'M84: 2K vs 2L' },
    { home: getWinner('B'), away: getThirdForWinner('B'), label: 'M85: 1B vs 3E/F/G/I/J' },
    { home: getRunnerUp('D'), away: getRunnerUp('G'), label: 'M86: 2D vs 2G' },
    { home: getWinner('J'), away: getRunnerUp('H'), label: 'M87: 1J vs 2H' },
    { home: getWinner('K'), away: getThirdForWinner('K'), label: 'M88: 1K vs 3D/E/I/J/L' }
  ]
}
