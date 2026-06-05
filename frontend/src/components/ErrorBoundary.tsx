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
        <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
          <div className="text-center">
            <p className="text-5xl mb-4">⚽</p>
            <h1 className="text-xl font-bold text-yellow-400 mb-2">Algo salió mal</h1>
            <p className="text-gray-500 mb-6">El error fue reportado automáticamente.</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-yellow-400 text-gray-950 font-bold px-6 py-2 rounded-lg hover:bg-yellow-300"
            >
              Recargar página
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
