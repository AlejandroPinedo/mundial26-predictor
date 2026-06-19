import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'

interface Stadium {
  name: string
  fifaName: string
  region: 'Este' | 'Centro' | 'Oeste'
  city: string
  country: string
  capacity: number
  matches: string
  countryCode: 'US' | 'MX' | 'CA'
}

// fifaName y region: nombres de sede oficiales FIFA + zona del torneo,
// del dataset abierto worldcup2026 (ISC). Ver tools/wc2026-dataset-check/.
const STADIUMS: Stadium[] = [
  {
    name: 'MetLife Stadium',
    fifaName: 'New York/New Jersey Stadium',
    region: 'Este',
    city: 'East Rutherford / New York / New Jersey',
    country: 'EE. UU.',
    capacity: 82500,
    matches: '8 partidos (incluyendo la Gran Final)',
    countryCode: 'US',
  },
  {
    name: 'Estadio Azteca',
    fifaName: 'Mexico City Stadium',
    region: 'Centro',
    city: 'Ciudad de México',
    country: 'México',
    capacity: 87523,
    matches: '5 partidos (incluyendo el partido inaugural)',
    countryCode: 'MX',
  },
  {
    name: 'SoFi Stadium',
    fifaName: 'Los Angeles Stadium',
    region: 'Oeste',
    city: 'Inglewood / Los Angeles',
    country: 'EE. UU.',
    capacity: 70240,
    matches: '8 partidos',
    countryCode: 'US',
  },
  {
    name: 'Mercedes-Benz Stadium',
    fifaName: 'Atlanta Stadium',
    region: 'Este',
    city: 'Atlanta',
    country: 'EE. UU.',
    capacity: 71000,
    matches: '8 partidos (incluyendo una semifinal)',
    countryCode: 'US',
  },
  {
    name: 'Lincoln Financial Field',
    fifaName: 'Philadelphia Stadium',
    region: 'Este',
    city: 'Filadelfia',
    country: 'EE. UU.',
    capacity: 67594,
    matches: '6 partidos',
    countryCode: 'US',
  },
  {
    name: 'Lumen Field',
    fifaName: 'Seattle Stadium',
    region: 'Oeste',
    city: 'Seattle',
    country: 'EE. UU.',
    capacity: 69000,
    matches: '6 partidos',
    countryCode: 'US',
  },
  {
    name: 'Levi\'s Stadium',
    fifaName: 'San Francisco Bay Area Stadium',
    region: 'Oeste',
    city: 'Santa Clara / San Francisco',
    country: 'EE. UU.',
    capacity: 68500,
    matches: '6 partidos',
    countryCode: 'US',
  },
  {
    name: 'Gillette Stadium',
    fifaName: 'Boston Stadium',
    region: 'Este',
    city: 'Foxborough / Boston',
    country: 'EE. UU.',
    capacity: 65878,
    matches: '7 partidos',
    countryCode: 'US',
  },
  {
    name: 'NRG Stadium',
    fifaName: 'Houston Stadium',
    region: 'Centro',
    city: 'Houston',
    country: 'EE. UU.',
    capacity: 72220,
    matches: '7 partidos',
    countryCode: 'US',
  },
  {
    name: 'AT&T Stadium',
    fifaName: 'Dallas Stadium',
    region: 'Centro',
    city: 'Arlington / Dallas',
    country: 'EE. UU.',
    capacity: 80000,
    matches: '9 partidos (incluyendo una semifinal)',
    countryCode: 'US',
  },
  {
    name: 'Hard Rock Stadium',
    fifaName: 'Miami Stadium',
    region: 'Este',
    city: 'Miami Gardens / Miami',
    country: 'EE. UU.',
    capacity: 64767,
    matches: '7 partidos (incluyendo el partido por el 3.er puesto)',
    countryCode: 'US',
  },
  {
    name: 'Arrowhead Stadium',
    fifaName: 'Kansas City Stadium',
    region: 'Centro',
    city: 'Kansas City',
    country: 'EE. UU.',
    capacity: 76416,
    matches: '6 partidos',
    countryCode: 'US',
  },
  {
    name: 'BC Place',
    fifaName: 'BC Place Vancouver',
    region: 'Oeste',
    city: 'Vancouver',
    country: 'Canadá',
    capacity: 54500,
    matches: '7 partidos',
    countryCode: 'CA',
  },
  {
    name: 'BMO Field',
    fifaName: 'Toronto Stadium',
    region: 'Este',
    city: 'Toronto',
    country: 'Canadá',
    capacity: 45000,
    matches: '6 partidos',
    countryCode: 'CA',
  },
  {
    name: 'Estadio BBVA',
    fifaName: 'Estadio Monterrey',
    region: 'Centro',
    city: 'Monterrey',
    country: 'México',
    capacity: 53500,
    matches: '4 partidos',
    countryCode: 'MX',
  },
  {
    name: 'Estadio Akron',
    fifaName: 'Estadio Guadalajara',
    region: 'Centro',
    city: 'Guadalajara',
    country: 'México',
    capacity: 48071,
    matches: '4 partidos',
    countryCode: 'MX',
  },
]

const FLAG_MAP = {
  US: '🇺🇸',
  MX: '🇲🇽',
  CA: '🇨🇦',
}

const COUNTRY_NAME_MAP = {
  US: 'Estados Unidos',
  MX: 'México',
  CA: 'Canadá',
}

/* Estilo por país anfitrión: CA rojo · MX verde · US azul (solo clases) */
const COUNTRY_STYLE: Record<'US' | 'MX' | 'CA', { text: string; chip: string; iconBg: string }> = {
  US: { text: 'text-us', chip: 'bg-us/10 border-us/30 text-us', iconBg: 'bg-us/10' },
  MX: { text: 'text-mx', chip: 'bg-mx/10 border-mx/30 text-mx', iconBg: 'bg-mx/10' },
  CA: { text: 'text-ca', chip: 'bg-ca/10 border-ca/30 text-ca', iconBg: 'bg-ca/10' },
}

export default function StadiumsPage() {
  const [search, setSearch] = useState('')
  const [filterCountry, setFilterCountry] = useState<'ALL' | 'US' | 'MX' | 'CA'>('ALL')

  const filteredStadiums = STADIUMS.filter(stadium => {
    const matchesSearch =
      stadium.name.toLowerCase().includes(search.toLowerCase()) ||
      stadium.fifaName.toLowerCase().includes(search.toLowerCase()) ||
      stadium.city.toLowerCase().includes(search.toLowerCase()) ||
      stadium.country.toLowerCase().includes(search.toLowerCase()) ||
      stadium.region.toLowerCase().includes(search.toLowerCase())

    const matchesCountry = filterCountry === 'ALL' || stadium.countryCode === filterCountry

    return matchesSearch && matchesCountry
  })

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 font-sans">

        <PageHeader title="ESTADIOS" subtitle="16 sedes · USA · México · Canadá 2026" icon="🏟️" />

        {/* Resumen rápido */}
        <div className="glass rounded-2xl px-5 py-4 mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 fade-up-1">
          <div>
            <span className="font-condensed font-extrabold text-[10px] uppercase tracking-[0.18em] text-gray-500 block">Capacidad Total</span>
            <span className="font-display text-xl text-gold leading-tight">
              {STADIUMS.reduce((sum, s) => sum + s.capacity, 0).toLocaleString()}
            </span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <span className="font-condensed font-extrabold text-[10px] uppercase tracking-[0.18em] text-gray-500 block">Ciudades Sedes</span>
            <span className="font-display text-xl text-gold leading-tight">{STADIUMS.length}</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <span className="font-condensed font-extrabold text-[10px] uppercase tracking-[0.18em] text-gray-500 block">Países</span>
            <span className="font-display text-xl text-gold leading-tight">3</span>
          </div>
        </div>

        {/* Búsqueda y filtros */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-8 fade-up-2">
          <div className="relative flex-1">
            <Icon name="search" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nombre de estadio, ciudad o país..."
              className="w-full bg-panel border border-white/8 text-white pl-11 pr-4 py-3 rounded-2xl text-sm outline-none focus:border-gold/40 transition-colors placeholder:text-gray-600"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                { code: 'ALL', label: 'Todos', flag: null },
                { code: 'US', label: 'EE. UU.', flag: '🇺🇸' },
                { code: 'MX', label: 'México', flag: '🇲🇽' },
                { code: 'CA', label: 'Canadá', flag: '🇨🇦' },
              ] as const
            ).map(({ code, label, flag }) => (
              <button
                key={code}
                onClick={() => setFilterCountry(code)}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[11px] font-condensed font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  filterCountry === code
                    ? 'bg-gold text-ink-950 shadow-[0_4px_14px_-4px_rgba(255,195,0,0.5)]'
                    : 'bg-panel border border-white/8 text-gray-400 hover:text-white hover:border-white/20'
                }`}
              >
                {label}
                {flag && <span className="no-invert">{flag}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de estadios */}
        {filteredStadiums.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 fade-up-3">
            {filteredStadiums.map(stadium => {
              const style = COUNTRY_STYLE[stadium.countryCode]
              return (
                <div
                  key={stadium.name}
                  className="relative bg-panel border border-white/8 rounded-2xl overflow-hidden hover-lift flex flex-col"
                >
                  <div className="tri-stripe" />
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className={`w-11 h-11 rounded-xl border border-white/8 flex items-center justify-center flex-shrink-0 ${style.iconBg}`}>
                        <Icon name="stadium" size={22} className={style.text} />
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`inline-flex items-center gap-1.5 font-condensed font-extrabold text-[10px] uppercase tracking-[0.14em] px-2.5 py-1 rounded-full border ${style.chip}`}>
                          <span className="no-invert">{FLAG_MAP[stadium.countryCode]}</span>
                          {COUNTRY_NAME_MAP[stadium.countryCode]}
                        </span>
                        <span className="inline-flex items-center font-condensed font-extrabold text-[9px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-gray-400">
                          Zona {stadium.region}
                        </span>
                      </div>
                    </div>

                    <h3 className="font-display text-lg text-white uppercase leading-tight tracking-tight">
                      {stadium.name}
                    </h3>
                    <p className="font-condensed font-semibold text-[10px] uppercase tracking-[0.14em] text-gray-600 mt-1">
                      Sede FIFA · {stadium.fifaName}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-gray-500 mt-1.5">
                      <Icon name="pin" size={12} className="flex-shrink-0" />
                      <span className="truncate">{stadium.city}</span>
                    </p>

                    <div className="mt-4 pt-4 border-t border-white/8">
                      <p className="font-condensed font-extrabold text-[10px] uppercase tracking-[0.18em] text-gray-500">Capacidad</p>
                      <p className="font-display text-3xl text-gold leading-none mt-1.5">
                        {stadium.capacity.toLocaleString()}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-1">espectadores</p>
                    </div>

                    <div className="mt-auto pt-4">
                      <p className="font-condensed font-extrabold text-[10px] uppercase tracking-[0.18em] text-gray-500 mb-1.5">Partidos Asignados</p>
                      <p className="flex items-start gap-1.5 text-xs text-gray-300 leading-snug">
                        <Icon name="ball" size={13} className={`flex-shrink-0 mt-0.5 ${style.text}`} />
                        {stadium.matches}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-14 bg-panel border border-white/8 rounded-2xl fade-up-3">
            <Icon name="search" size={36} className="mx-auto text-gray-600 mb-3" />
            <h3 className="font-condensed font-extrabold uppercase tracking-wider text-sm text-white mb-1">No se encontraron estadios</h3>
            <p className="text-gray-500 text-sm">
              Intenta cambiar la búsqueda o el filtro de país.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
