import type { ApiMatch, SimConfig } from './tournament'
import type { SimResults } from './aggregate'
import type { UserInputs } from './userScore'

export type WorkerRequest = { type: 'run'; matches: ApiMatch[]; config: SimConfig; user?: UserInputs }

export type WorkerResponse =
  | { type: 'progress'; done: number; total: number }
  | { type: 'done'; results: SimResults }
  | { type: 'error'; message: string }
