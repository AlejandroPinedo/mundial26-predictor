import { getFlag, getFlagCode } from '../utils/flags'

interface Props {
  team: string
  /** Clases de tamaño/layout para la imagen, p. ej. "h-4 flex-shrink-0" */
  className?: string
}

// Bandera como imagen local (/flags/<code>.png): Windows no renderiza los
// emojis de bandera (muestra pares de letras tipo "MX"). Fallback al emoji
// si el equipo no tiene código ISO. Importante: la clase no-invert va en la
// <img> y el contenedor NO debe llevarla, o el modo claro la invierte doble.
export default function Flag({ team, className = 'h-4' }: Props) {
  const code = getFlagCode(team)
  if (!code) {
    return <span className={`no-invert ${className}`}>{getFlag(team)}</span>
  }
  return (
    <img
      src={`/flags/${code}.png`}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      className={`no-invert inline-block w-auto align-[-0.125em] rounded-[3px] ring-1 ring-white/15 select-none ${className}`}
    />
  )
}
