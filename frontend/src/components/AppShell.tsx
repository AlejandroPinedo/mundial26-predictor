import { useEffect, useState, type ReactNode } from 'react'
import { apiFetch } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'

interface Props { children: ReactNode }

export default function AppShell({ children }: Props) {
  const { token } = useAuth()
  const [unpredicted, setUnpredicted] = useState(0)

  useEffect(() => {
    if (!token) return
    const load = () => Promise.all([
      apiFetch('/predictions/matches'),
      apiFetch('/predictions/my'),
    ]).then(([m, p]) => {
      const now = new Date()
      const predMap = new Set(p.predictions.map((x: { match_id: string }) => x.match_id))
      const count = m.matches.filter((match: { home_score: null | number; match_date: string; id: string }) =>
        match.home_score === null &&
        now < new Date(match.match_date) &&
        !predMap.has(match.id)
      ).length
      setUnpredicted(count)
    }).catch(() => {})
    load()
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [token])

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <Sidebar unpredicted={unpredicted} />
      <main className="md:ml-56 pb-16 md:pb-0 relative">
        {children}
      </main>
      <BottomNav unpredicted={unpredicted} />
    </div>
  )
}
