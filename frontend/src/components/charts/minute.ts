// Convierte el minuto que da FIFA ("90'+8'", "45'+5'", "73'") en un minuto
// "efectivo" para clasificarlo en tramos de la gráfica de goles por minuto.
//
// Clave del cálculo: el tiempo añadido de la 2ª parte (90+X) debe contar como
// POST-90 (si no, parseInt('90+8')=90 y todos caen en el tramo 76–90'). El
// añadido de la 1ª parte (45+X) se queda en su tramo (≤45), no salta al segundo.
export function effectiveMinute(raw: string): number | null {
  if (!raw) return null
  const m = raw.match(/(\d+)\s*'?\s*\+\s*(\d+)/) // "90'+8'" | "90+8" → base, añadido
  if (m) {
    const base = parseInt(m[1], 10)
    const added = parseInt(m[2], 10)
    return base === 45 ? 45 : base + added
  }
  const n = parseInt(raw, 10) // "73'" | "90'" | "12"
  return Number.isNaN(n) ? null : n
}
