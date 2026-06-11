// Web Worker del simulador: solo importa el motor puro (sin React ni api/client).
// Cancelación = worker.terminate() desde la página; no hace falta protocolo cooperativo.
import { runSimulation } from './runner'
import type { WorkerRequest, WorkerResponse } from './protocol'

const post = (msg: WorkerResponse) => self.postMessage(msg)

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  if (e.data.type !== 'run') return
  try {
    const results = runSimulation(e.data.matches, e.data.config, (done, total) =>
      post({ type: 'progress', done, total })
    )
    post({ type: 'done', results })
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}
