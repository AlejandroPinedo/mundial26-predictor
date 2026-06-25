// Cableado oficial del bracket FIFA 2026 compartido entre BracketPage y el simulador.
// El índice del array es el partido de 32avos (M73..M88, índice 0..15);
// el valor es el slot de 16avos que recibe a su ganador (los slots se emparejan
// de a dos: slots 2k y 2k+1 forman el partido de la siguiente ronda).
// Slots 0–7 = mitad de la SEMI M101 (cuartos M97+M98); slots 8–15 = mitad M102
// (cuartos M99+M100). Clave del cableado oficial FIFA 2026: los cuartos NO emparejan
// octavos adyacentes — M98=M93/M94 y M99=M91/M92. Por eso el grupo de M76 (octavo
// M91) cae en la MITAD DERECHA (M102), no junto a M73/M74/M75 (M101).
export const R32_TO_R16_SLOT: readonly number[] = [
  2,  // Match 73 -> R16 M90 (slot 2)   · mitad M101
  0,  // Match 74 -> R16 M89 (slot 0)   · mitad M101
  3,  // Match 75 -> R16 M90 (slot 3)   · mitad M101
  8,  // Match 76 -> R16 M91 (slot 8)   · mitad M102 (der)
  1,  // Match 77 -> R16 M89 (slot 1)   · mitad M101
  9,  // Match 78 -> R16 M91 (slot 9)   · mitad M102 (der)
  10, // Match 79 -> R16 M92 (slot 10)  · mitad M102 (der)
  11, // Match 80 -> R16 M92 (slot 11)  · mitad M102 (der)
  4,  // Match 81 -> R16 M93 (slot 4)   · mitad M101 (izq)
  5,  // Match 82 -> R16 M93 (slot 5)   · mitad M101 (izq)
  6,  // Match 83 -> R16 M94 (slot 6)   · mitad M101 (izq)
  7,  // Match 84 -> R16 M94 (slot 7)   · mitad M101 (izq)
  14, // Match 85 -> R16 M96 (slot 14)  · mitad M102
  12, // Match 86 -> R16 M95 (slot 12)  · mitad M102
  15, // Match 87 -> R16 M96 (slot 15)  · mitad M102
  13  // Match 88 -> R16 M95 (slot 13)  · mitad M102
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
