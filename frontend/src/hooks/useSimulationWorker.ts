import { useEffect, useRef, useState, useCallback } from 'react'
import type { ApiMatch, SimConfig } from '../sim/tournament'
import type { SimResults } from '../sim/aggregate'
import type { UserInputs } from '../sim/userScore'
import type { WorkerRequest, WorkerResponse } from '../sim/protocol'

export function useSimulationWorker() {
  const workerRef = useRef<Worker | null>(null)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<SimResults | null>(null)
  const [error, setError] = useState<string | null>(null)

  const cancel = useCallback(() => {
    workerRef.current?.terminate()
    workerRef.current = null
    setRunning(false)
    setProgress(0)
  }, [])

  const run = useCallback((matches: ApiMatch[], config: SimConfig, user?: UserInputs) => {
    workerRef.current?.terminate()
    setRunning(true)
    setProgress(0)
    setError(null)

    const worker = new Worker(new URL('../sim/worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data
      if (msg.type === 'progress') {
        setProgress(msg.done / msg.total)
      } else if (msg.type === 'done') {
        setResults(msg.results)
        setRunning(false)
        worker.terminate()
        workerRef.current = null
      } else if (msg.type === 'error') {
        setError(msg.message)
        setRunning(false)
        worker.terminate()
        workerRef.current = null
      }
    }
    worker.onerror = (e) => {
      setError(e.message || 'Error en el worker de simulación')
      setRunning(false)
      worker.terminate()
      workerRef.current = null
    }

    const request: WorkerRequest = { type: 'run', matches, config, user }
    worker.postMessage(request)
  }, [])

  useEffect(() => () => workerRef.current?.terminate(), [])

  return { run, cancel, running, progress, results, error, setResults }
}
