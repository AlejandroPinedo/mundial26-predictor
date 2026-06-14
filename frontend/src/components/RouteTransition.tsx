import { useState } from 'react'
import { useLocation } from 'react-router-dom'

// Barrido tri-nación SOLO en el flujo de entrada (landing ↔ login/registro ↔ home).
// La navegación dentro de la app conserva sus animaciones fade-up.
const FLOW = new Set(['/', '/login', '/register', '/home'])

export default function RouteTransition() {
  const { pathname } = useLocation()
  const [state, setState] = useState({ prev: pathname, key: 0, on: false })

  // Ajuste de estado derivado del cambio de ruta (se aplica antes del pintado → sin parpadeo).
  if (pathname !== state.prev) {
    const inFlow = FLOW.has(state.prev) && FLOW.has(pathname)
    setState({ prev: pathname, key: state.key + 1, on: inFlow })
  }

  if (!state.on) return null
  return (
    <div
      key={state.key}
      className="route-wipe"
      aria-hidden="true"
      onAnimationEnd={() => setState(s => ({ ...s, on: false }))}
    />
  )
}
