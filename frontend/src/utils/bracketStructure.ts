// Cableado oficial del bracket FIFA 2026 compartido entre BracketPage y el simulador.
// El índice del array es el partido de 32avos (M73..M88, índice 0..15); el valor es
// el slot de 16avos (0..15) que recibe a su ganador. Los slots se emparejan de a dos
// (2k, 2k+1) formando el partido de octavos m_k.
//
// Estructura oficial (Wikipedia, WC2026 knockout): R16 M89=W73/W74, M90=W75/W76,
// M93=W81/W82, M94=W83/W84, M91=W77/W78, M92=W79/W80, M95=W85/W86, M96=W87/W88.
// Cuartos NO adyacentes: M97=M89/M90, M98=M93/M94, M99=M91/M92, M100=M95/M96;
// Semis M101=M97/M98 (mitad izq, slots 0–7), M102=M99/M100 (mitad der, slots 8–15).
// Con esto el mapeo queda secuencial salvo el intercalado de cuartos:
//   M73..M76 -> slots 0..3   (octavos M89,M90 · cuarto M97)
//   M81..M84 -> slots 4..7   (octavos M93,M94 · cuarto M98)
//   M77..M80 -> slots 8..11  (octavos M91,M92 · cuarto M99)
//   M85..M88 -> slots 12..15 (octavos M95,M96 · cuarto M100)
export const R32_TO_R16_SLOT: readonly number[] = [
  0, 1, 2, 3,      // M73,M74,M75,M76 -> slots 0..3   (mitad izq, cuarto M97)
  8, 9, 10, 11,    // M77,M78,M79,M80 -> slots 8..11  (mitad der, cuarto M99)
  4, 5, 6, 7,      // M81,M82,M83,M84 -> slots 4..7   (mitad izq, cuarto M98)
  12, 13, 14, 15,  // M85,M86,M87,M88 -> slots 12..15 (mitad der, cuarto M100)
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
