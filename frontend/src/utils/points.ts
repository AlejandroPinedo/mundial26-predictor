export function getPointsBadge(points: number): string {
    if (points === 3) return 'Marcador exacto'
    if (points === 1) return 'Resultado correcto'
    return 'Sin puntos'
  }