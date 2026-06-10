import { Component, type ReactNode } from 'react'
import * as Sentry from '@sentry/react'

interface Props { children: ReactNode }
interface State { hasError: boolean }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    Sentry.captureException(error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-ink-950 text-white flex items-center justify-center relative overflow-hidden">
          <span className="wm-26 left-1/2 -translate-x-1/2 -top-8" aria-hidden="true">26</span>
          <div className="text-center relative z-10 px-6">
            <p className="text-5xl mb-4 no-invert">⚽</p>
            <h1 className="font-display text-2xl uppercase tracking-wide text-gold mb-2">Algo salió mal</h1>
            <p className="text-gray-500 mb-6">El error fue reportado automáticamente.</p>
            <button onClick={() => window.location.reload()} className="btn-gold">
              Recargar página
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
