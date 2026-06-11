import type { ApiMatch, SimConfig } from './tournament'
import type { SimResults } from './aggregate'

export type WorkerRequest = { type: 'run'; matches: ApiMatch[]; config: SimConfig }

export type WorkerResponse =
  | { type: 'progress'; done: number; total: number }
  | { type: 'done'; results: SimResults }
  | { type: 'error'; message: string }
