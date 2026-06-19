/**
 * Código FIFA de 3 letras (el campo `tla` de football-data.org) → nombre de la
 * selección EXACTO como aparece en la tabla `matches` (español).
 *
 * Cubre las 48 selecciones del WC2026. Verificado 72/72 contra el fixture real
 * (ver tools/wc2026-dataset-check). Si football-data añadiera un código nuevo
 * que no esté aquí, sync-results.ts lo reporta como "tla sin mapear" y lo ignora.
 */
export const FIFA_TLA_TO_ES: Record<string, string> = {
  GER: 'Alemania',
  KSA: 'Arabia Saudí',
  ALG: 'Argelia',
  ARG: 'Argentina',
  AUS: 'Australia',
  AUT: 'Austria',
  BEL: 'Bélgica',
  BIH: 'Bosnia y Herzegovina',
  BRA: 'Brasil',
  CPV: 'Cabo Verde',
  CAN: 'Canadá',
  QAT: 'Catar',
  COL: 'Colombia',
  KOR: 'Corea del Sur',
  CIV: 'Costa de Marfil',
  CRO: 'Croacia',
  CUW: 'Curazao',
  ECU: 'Ecuador',
  EGY: 'Egipto',
  SCO: 'Escocia',
  ESP: 'España',
  USA: 'Estados Unidos',
  FRA: 'Francia',
  GHA: 'Ghana',
  HAI: 'Haití',
  ENG: 'Inglaterra',
  IRQ: 'Irak',
  IRN: 'Irán',
  JPN: 'Japón',
  JOR: 'Jordania',
  MAR: 'Marruecos',
  MEX: 'México',
  NOR: 'Noruega',
  NZL: 'Nueva Zelanda',
  NED: 'Países Bajos',
  PAN: 'Panamá',
  PAR: 'Paraguay',
  POR: 'Portugal',
  CZE: 'República Checa',
  COD: 'República Democrática del Congo',
  SEN: 'Senegal',
  RSA: 'Sudáfrica',
  SWE: 'Suecia',
  SUI: 'Suiza',
  TUR: 'Turquía',
  TUN: 'Túnez',
  URU: 'Uruguay',
  UZB: 'Uzbekistán',

  // football-data.org a veces devuelve el código ISO-3166 alpha-3 (u otro propio)
  // en lugar del FIFA para algunas selecciones, de forma intermitente. Alias para
  // todas las del WC26 donde difieren, así un partido finalizado nunca queda sin
  // mapear. (sync-results.ts igual avisa si apareciera un código nuevo.)
  DEU: 'Alemania',
  SAU: 'Arabia Saudí',
  DZA: 'Argelia',
  HRV: 'Croacia',
  CUR: 'Curazao',
  HTI: 'Haití',
  NLD: 'Países Bajos',
  PRY: 'Paraguay',
  PRT: 'Portugal',
  ZAF: 'Sudáfrica',
  CHE: 'Suiza',
  URY: 'Uruguay',
}
