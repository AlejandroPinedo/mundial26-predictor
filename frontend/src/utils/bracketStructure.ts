// Cableado oficial del bracket FIFA 2026 compartido entre BracketPage y el simulador.
// El índice del array es el partido de 32avos (M73..M88, índice 0..15);
// el valor es el slot de 16avos que recibe a su ganador (los slots se emparejan
// de a dos: slots 2k y 2k+1 forman el partido de la siguiente ronda).
export const R32_TO_R16_SLOT: readonly number[] = [
  2,  // Match 73 -> R16 Match 90 home (slot 2)
  0,  // Match 74 -> R16 Match 89 home (slot 0)
  3,  // Match 75 -> R16 Match 90 away (slot 3)
  4,  // Match 76 -> R16 Match 91 home (slot 4)
  1,  // Match 77 -> R16 Match 89 away (slot 1)
  5,  // Match 78 -> R16 Match 91 away (slot 5)
  6,  // Match 79 -> R16 Match 92 home (slot 6)
  7,  // Match 80 -> R16 Match 92 away (slot 7)
  8,  // Match 81 -> R16 Match 93 home (slot 8)
  9,  // Match 82 -> R16 Match 93 away (slot 9)
  10, // Match 83 -> R16 Match 94 home (slot 10)
  11, // Match 84 -> R16 Match 94 away (slot 11)
  14, // Match 85 -> R16 Match 96 home (slot 14)
  12, // Match 86 -> R16 Match 95 home (slot 12)
  15, // Match 87 -> R16 Match 96 away (slot 15)
  13  // Match 88 -> R16 Match 95 away (slot 13)
]

// Los equipos del bracket se guardan con prefijo de slot ("0:México") — esto lo limpia.
export function parseTeamName(prefixedName: string | null): string | null {
  if (!prefixedName) return null
  const parts = prefixedName.split(':')
  if (parts.length > 1 && !isNaN(Number(parts[0]))) {
    return parts.slice(1).join(':')
  }
  return prefixedName
}
