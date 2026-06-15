// Ratings Elo de las 48 selecciones del Mundial 2026.
// ESPEJO de frontend/src/utils/ratings.ts (snapshot eloratings.net 2026-06-10).
// Las claves DEBEN coincidir exactamente con los nombres de la tabla matches.
export const DEFAULT_ELO = 1500
export const HOST_NATIONS = new Set(['México', 'Estados Unidos', 'Canadá'])

export const ELO_RATINGS: Record<string, number> = {
  España: 2157,
  Argentina: 2115,
  Francia: 2063,
  Inglaterra: 2024,
  Brasil: 1991,
  Portugal: 1989,
  Colombia: 1982,
  'Países Bajos': 1948,
  Ecuador: 1938,
  Alemania: 1932,
  Noruega: 1914,
  Croacia: 1912,
  Turquía: 1911,
  Japón: 1906,
  Bélgica: 1894,
  Uruguay: 1892,
  Suiza: 1891,
  México: 1875,
  Senegal: 1860,
  Paraguay: 1834,
  Austria: 1830,
  Marruecos: 1827,
  Canadá: 1788,
  Escocia: 1782,
  Australia: 1777,
  Irán: 1772,
  Argelia: 1772,
  'Corea del Sur': 1758,
  'República Checa': 1740,
  Panamá: 1730,
  'Estados Unidos': 1726,
  Uzbekistán: 1714,
  Suecia: 1712,
  Egipto: 1696,
  'Costa de Marfil': 1695,
  Jordania: 1680,
  'República Democrática del Congo': 1652,
  Túnez: 1628,
  Irak: 1607,
  'Bosnia y Herzegovina': 1595,
  'Cabo Verde': 1578,
  'Arabia Saudí': 1576,
  'Nueva Zelanda': 1562,
  Haití: 1548,
  Sudáfrica: 1517,
  Ghana: 1510,
  Curazao: 1434,
  Catar: 1421,
}

export function getElo(team: string): number {
  return ELO_RATINGS[team] ?? DEFAULT_ELO
}
