import { useEffect, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/client'
import { getFlag } from '../utils/flags'

type MatchBase = { id: string; home_team: string; away_team: string; home_score: number | null; away_score: number | null }

// Polling-based realtime: checks every 30s for new results
// When a match goes from no result → result, shows toast notification
export function useRealtimeMatches<T extends MatchBase>(onUpdate: (matches: T[]) => void, intervalMs = 30_000) {
  const prevResultsRef = useRef<Record<string, { home: number; away: number } | null>>({})

  const check = useCallback(async (silent: boolean) => {
    try {
      const data = await apiFetch('/predictions/matches')
      const matches: T[] = data.matches

      if (silent) {
        const newResults: T[] = []
        for (const m of matches) {
          const prev = prevResultsRef.current[m.id]
          if (m.home_score !== null && m.away_score !== null && prev === undefined) {
            newResults.push(m)
          }
        }
        if (newResults.length > 0) {
          newResults.forEach(m => {
            toast(
              `${getFlag(m.home_team)} ${m.home_team} ${m.home_score}–${m.away_score} ${m.away_team} ${getFlag(m.away_team)}`,
              { icon: '⚽', duration: 6000 }
            )
          })
          onUpdate(matches)
        }
      }

      // Update ref with current results
      const map: Record<string, { home: number; away: number } | null> = {}
      for (const m of matches) {
        map[m.id] = m.home_score !== null && m.away_score !== null
          ? { home: m.home_score, away: m.away_score }
          : null
      }
      prevResultsRef.current = map

      if (!silent) onUpdate(matches)
    } catch {
      // silent fail
    }
  }, [onUpdate])

  useEffect(() => {
    check(false)
    const interval = setInterval(() => check(true), intervalMs)
    return () => clearInterval(interval)
  }, [check, intervalMs])
}
