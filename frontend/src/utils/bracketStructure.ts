// Cableado oficial del bracket FIFA 2026 compartido entre BracketPage y el simulador.
// El índice del array es el partido de 32avos (M73..M88, índice 0..15); el valor es
// el slot de 16avos (0..15) que recibe a su ganador. Los slots se emparejan de a dos
// (2k, 2k+1) formando el partido de octavos m_k.
//
// Estructura oficial (Wikipedia, WC2026 knockout):
//   Octavos:  M89=W74/W77, M90=W73/W75, M91=W76/W78, M92=W79/W80,
//             M93=W83/W84, M94=W81/W82, M95=W86/W88, M96=W85/W87.
//   Cuartos:  M97=W89/W90, M98=W93/W94, M99=W91/W92, M100=W95/W96.
//   Semis:    M101=W97/W98, M102=W99/W100.
// Con esto, el ruteo de 32avos (M73..M88) a slots del frontend (0..15) queda de la siguiente forma:
//   M73 -> slot 2  (M90 Home)
//   M74 -> slot 0  (M89 Home)
//   M75 -> slot 3  (M90 Away)
//   M76 -> slot 8  (M91 Home)
//   M77 -> slot 1  (M89 Away)
//   M78 -> slot 9  (M91 Away)
//   M79 -> slot 10 (M92 Home)
//   M80 -> slot 11 (M92 Away)
//   M81 -> slot 6  (M94 Home)
//   M82 -> slot 7  (M94 Away)
//   M83 -> slot 4  (M93 Home)
//   M84 -> slot 5  (M93 Away)
//   M85 -> slot 14 (M96 Home)
//   M86 -> slot 12 (M95 Home)
//   M87 -> slot 15 (M96 Away)
//   M88 -> slot 13 (M95 Away)
export const R32_TO_R16_SLOT: readonly number[] = [
  2, 0, 3, 8, 1, 9, 10, 11, 6, 7, 4, 5, 14, 12, 15, 13
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
