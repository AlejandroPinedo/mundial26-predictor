import { getElo } from './ratings'

// Valor de mercado del plantel (millones de EUR, Transfermarkt junio 2026)
// y 3 figuras por selección (verificadas en las listas oficiales del Mundial).
// Las claves DEBEN coincidir con utils/flags.ts (lo garantiza squads.test.ts).
export type Squad = { marketValue: number; stars: string[] }

export const SQUADS: Record<string, Squad> = {
  'Francia': { marketValue: 1530, stars: ['Kylian Mbappé', 'Ousmane Dembélé', 'Michael Olise'] },
  'Inglaterra': { marketValue: 1310, stars: ['Jude Bellingham', 'Harry Kane', 'Bukayo Saka'] },
  'España': { marketValue: 1260, stars: ['Lamine Yamal', 'Pedri', 'Nico Williams'] },
  'Portugal': { marketValue: 1020, stars: ['Cristiano Ronaldo', 'Bruno Fernandes', 'Rafael Leão'] },
  'Alemania': { marketValue: 998, stars: ['Jamal Musiala', 'Florian Wirtz', 'Joshua Kimmich'] },
  'Brasil': { marketValue: 912, stars: ['Vinícius Júnior', 'Raphinha', 'Rodrygo'] },
  'Países Bajos': { marketValue: 837, stars: ['Virgil van Dijk', 'Frenkie de Jong', 'Cody Gakpo'] },
  'Argentina': { marketValue: 818, stars: ['Lionel Messi', 'Julián Álvarez', 'Lautaro Martínez'] },
  'Noruega': { marketValue: 601, stars: ['Erling Haaland', 'Martin Ødegaard', 'Antonio Nusa'] },
  'Bélgica': { marketValue: 543, stars: ['Kevin De Bruyne', 'Jérémy Doku', 'Romelu Lukaku'] },
  'Costa de Marfil': { marketValue: 531, stars: ['Amad Diallo', 'Franck Kessié', 'Simon Adingra'] },
  'Turquía': { marketValue: 494, stars: ['Hakan Çalhanoğlu', 'Arda Güler', 'Kenan Yıldız'] },
  'Marruecos': { marketValue: 488, stars: ['Achraf Hakimi', 'Brahim Díaz', 'Yassine Bounou'] },
  'Senegal': { marketValue: 473, stars: ['Sadio Mané', 'Nicolas Jackson', 'Kalidou Koulibaly'] },
  'Suecia': { marketValue: 429, stars: ['Alexander Isak', 'Viktor Gyökeres', 'Dejan Kulusevski'] },
  'Uruguay': { marketValue: 406, stars: ['Federico Valverde', 'Darwin Núñez', 'Ronald Araújo'] },
  'Croacia': { marketValue: 386, stars: ['Luka Modrić', 'Joško Gvardiol', 'Mateo Kovačić'] },
  'Estados Unidos': { marketValue: 379, stars: ['Christian Pulisic', 'Weston McKennie', 'Tyler Adams'] },
  'Ecuador': { marketValue: 376, stars: ['Moisés Caicedo', 'Piero Hincapié', 'Kendry Páez'] },
  'Suiza': { marketValue: 334, stars: ['Granit Xhaka', 'Manuel Akanji', 'Breel Embolo'] },
  'Colombia': { marketValue: 306, stars: ['Luis Díaz', 'James Rodríguez', 'Jhon Durán'] },
  'Japón': { marketValue: 280, stars: ['Takefusa Kubo', 'Kaoru Mitoma', 'Wataru Endo'] },
  'Austria': { marketValue: 272, stars: ['David Alaba', 'Marko Arnautović', 'Christoph Baumgartner'] },
  'Argelia': { marketValue: 258, stars: ['Riyad Mahrez', 'Amine Gouiri', 'Ismaël Bennacer'] },
  'Ghana': { marketValue: 231, stars: ['Mohammed Kudus', 'Antoine Semenyo', 'Iñaki Williams'] },
  'Canadá': { marketValue: 203, stars: ['Alphonso Davies', 'Jonathan David', 'Tajon Buchanan'] },
  'México': { marketValue: 195, stars: ['Santiago Giménez', 'Edson Álvarez', 'Raúl Jiménez'] },
  'República Checa': { marketValue: 190, stars: ['Patrik Schick', 'Tomáš Souček', 'Adam Hložek'] },
  'Escocia': { marketValue: 177, stars: ['Scott McTominay', 'Andy Robertson', 'John McGinn'] },
  'Paraguay': { marketValue: 157, stars: ['Julio Enciso', 'Miguel Almirón', 'Gustavo Gómez'] },
  'Bosnia y Herzegovina': { marketValue: 149, stars: ['Edin Džeko', 'Ermedin Demirović', 'Esmir Bajraktarević'] },
  'República Democrática del Congo': { marketValue: 149, stars: ['Yoane Wissa', 'Cédric Bakambu', 'Chancel Mbemba'] },
  'Corea del Sur': { marketValue: 142, stars: ['Son Heung-min', 'Lee Kang-in', 'Kim Min-jae'] },
  'Egipto': { marketValue: 135, stars: ['Mohamed Salah', 'Omar Marmoush', 'Mahmoud Trezeguet'] },
  'Australia': { marketValue: 74, stars: ['Mathew Ryan', 'Jackson Irvine', 'Harry Souttar'] },
  'Túnez': { marketValue: 70, stars: ['Hannibal Mejbri', 'Aïssa Laïdouni', 'Youssef Msakni'] },
  'Uzbekistán': { marketValue: 70, stars: ['Abdukodir Khusanov', 'Eldor Shomurodov', 'Abbosbek Fayzullaev'] },
  'Haití': { marketValue: 56, stars: ['Wilson Isidor', 'Jean-Ricner Bellegarde', 'Duckens Nazon'] },
  'Cabo Verde': { marketValue: 56, stars: ['Ryan Mendes', 'Logan Costa', 'Jamiro Monteiro'] },
  'Sudáfrica': { marketValue: 46, stars: ['Lyle Foster', 'Ronwen Williams', 'Teboho Mokoena'] },
  'Arabia Saudí': { marketValue: 37, stars: ['Salem Al-Dawsari', 'Firas Al-Buraikan', 'Mohammed Kanno'] },
  'Nueva Zelanda': { marketValue: 35, stars: ['Chris Wood', 'Liberato Cacace', 'Marko Stamenić'] },
  'Panamá': { marketValue: 35, stars: ['Adalberto Carrasquilla', 'Michael Amir Murillo', 'José Fajardo'] },
  'Irán': { marketValue: 33, stars: ['Mehdi Taremi', 'Sardar Azmoun', 'Alireza Jahanbakhsh'] },
  'Curazao': { marketValue: 26, stars: ['Leandro Bacuna', 'Juninho Bacuna', 'Tahith Chong'] },
  'Irak': { marketValue: 21, stars: ['Aymen Hussein', 'Ali Al-Hamadi', 'Mohanad Ali'] },
  'Catar': { marketValue: 20, stars: ['Akram Afif', 'Almoez Ali', 'Meshaal Barsham'] },
  'Jordania': { marketValue: 20, stars: ['Musa Al-Taamari', 'Ali Olwan', 'Yazan Al-Naimat'] },
}

// Normalización log del valor de mercado a escala Elo:
// 20 M€ (mínimo del torneo) → 1400 · cada década de valor suma ~426 puntos.
// Así Francia (1530 M€) ≈ 2200 y los valores quedan comparables al Elo de selección.
const SQUAD_ELO_FLOOR = 1400
const SQUAD_ELO_PER_DECADE = 426
const MIN_VALUE = 20

export function getSquadElo(team: string): { elo: number; fallback: boolean } {
  const squad = SQUADS[team]
  if (!squad) return { elo: getElo(team), fallback: true }
  const raw = SQUAD_ELO_FLOOR + SQUAD_ELO_PER_DECADE * Math.log10(squad.marketValue / MIN_VALUE)
  return { elo: Math.min(2250, Math.max(1350, raw)), fallback: false }
}

// Mezcla Elo de selección con Elo de plantilla. w ∈ [0,1]: 0 = solo selección, 1 = solo plantel.
export function blendRating(teamElo: number, squadElo: number, w: number): number {
  return (1 - w) * teamElo + w * squadElo
}
