import { useState } from 'react'

interface Stadium {
  name: string
  city: string
  country: string
  capacity: number
  matches: string
  countryCode: 'US' | 'MX' | 'CA'
}

const STADIUMS: Stadium[] = [
  {
    name: 'MetLife Stadium',
    city: 'East Rutherford / New York / New Jersey',
    country: 'EE. UU.',
    capacity: 82500,
    matches: '8 partidos (incluyendo la Gran Final)',
    countryCode: 'US',
  },
  {
    name: 'Estadio Azteca',
    city: 'Ciudad de México',
    country: 'México',
    capacity: 87523,
    matches: '5 partidos (incluyendo el partido inaugural)',
    countryCode: 'MX',
  },
  {
    name: 'SoFi Stadium',
    city: 'Inglewood / Los Angeles',
    country: 'EE. UU.',
    capacity: 70240,
    matches: '8 partidos',
    countryCode: 'US',
  },
  {
    name: 'Mercedes-Benz Stadium',
    city: 'Atlanta',
    country: 'EE. UU.',
    capacity: 71000,
    matches: '8 partidos (incluyendo una semifinal)',
    countryCode: 'US',
  },
  {
    name: 'Lincoln Financial Field',
    city: 'Filadelfia',
    country: 'EE. UU.',
    capacity: 67594,
    matches: '6 partidos',
    countryCode: 'US',
  },
  {
    name: 'Lumen Field',
    city: 'Seattle',
    country: 'EE. UU.',
    capacity: 69000,
    matches: '6 partidos',
    countryCode: 'US',
  },
  {
    name: 'Levi\'s Stadium',
    city: 'Santa Clara / San Francisco',
    country: 'EE. UU.',
    capacity: 68500,
    matches: '6 partidos',
    countryCode: 'US',
  },
  {
    name: 'Gillette Stadium',
    city: 'Foxborough / Boston',
    country: 'EE. UU.',
    capacity: 65878,
    matches: '7 partidos',
    countryCode: 'US',
  },
  {
    name: 'NRG Stadium',
    city: 'Houston',
    country: 'EE. UU.',
    capacity: 72220,
    matches: '7 partidos',
    countryCode: 'US',
  },
  {
    name: 'AT&T Stadium',
    city: 'Arlington / Dallas',
    country: 'EE. UU.',
    capacity: 80000,
    matches: '9 partidos (incluyendo una semifinal)',
    countryCode: 'US',
  },
  {
    name: 'Hard Rock Stadium',
    city: 'Miami Gardens / Miami',
    country: 'EE. UU.',
    capacity: 64767,
    matches: '7 partidos (incluyendo el partido por el 3.er puesto)',
    countryCode: 'US',
  },
  {
    name: 'Arrowhead Stadium',
    city: 'Kansas City',
    country: 'EE. UU.',
    capacity: 76416,
    matches: '6 partidos',
    countryCode: 'US',
  },
  {
    name: 'BC Place',
    city: 'Vancouver',
    country: 'Canadá',
    capacity: 54500,
    matches: '7 partidos',
    countryCode: 'CA',
  },
  {
    name: 'BMO Field',
    city: 'Toronto',
    country: 'Canadá',
    capacity: 45000,
    matches: '6 partidos',
    countryCode: 'CA',
  },
  {
    name: 'Estadio BBVA',
    city: 'Monterrey',
    country: 'México',
    capacity: 53500,
    matches: '4 partidos',
    countryCode: 'MX',
  },
  {
    name: 'Estadio Akron',
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

function StadiumSvg({ countryCode }: { countryCode: 'US' | 'MX' | 'CA' }) {
  const colors = {
    US: {
      gradStart: '#1e3a8a',
      gradMid: '#1e1b4b',
      gradEnd: '#450a0a',
      accent: '#3b82f6',
    },
    MX: {
      gradStart: '#064e3b',
      gradMid: '#0f172a',
      gradEnd: '#450a0a',
      accent: '#10b981',
    },
    CA: {
      gradStart: '#991b1b',
      gradMid: '#18181b',
      gradEnd: '#450a0a',
      accent: '#f43f5e',
    },
  }[countryCode]

  return (
    <svg className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`bg-${countryCode}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.gradStart} />
          <stop offset="50%" stopColor={colors.gradMid} />
          <stop offset="100%" stopColor={colors.gradEnd} />
        </linearGradient>
        <radialGradient id={`glow-${countryCode}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={colors.accent} stopOpacity="0.4" />
          <stop offset="100%" stopColor={colors.gradMid} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="400" height="200" fill={`url(#bg-${countryCode})`} />
      <circle cx="200" cy="100" r="150" fill={`url(#glow-${countryCode})`} />

      <ellipse cx="200" cy="120" rx="140" ry="60" stroke={colors.accent} strokeWidth="1" strokeOpacity="0.2" />
      <ellipse cx="200" cy="120" rx="120" ry="50" stroke={colors.accent} strokeWidth="1.5" strokeOpacity="0.3" strokeDasharray="5 5" />
      <ellipse cx="200" cy="120" rx="100" ry="40" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.15" />

      <polygon points="120,150 280,150 250,90 150,90" fill="#15803d" fillOpacity="0.6" stroke={colors.accent} strokeWidth="1.5" />

      <line x1="200" y1="90" x2="200" y2="150" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1" />
      <ellipse cx="200" cy="120" rx="20" ry="8" stroke="#ffffff" strokeOpacity="0.5" fill="none" strokeWidth="1" />

      <polygon points="135,90 165,90 170,105 130,105" stroke="#ffffff" strokeOpacity="0.4" fill="none" strokeWidth="1" />
      <polygon points="235,90 265,90 270,105 230,105" stroke="#ffffff" strokeOpacity="0.4" fill="none" strokeWidth="1" />
      <polygon points="110,150 145,150 150,130 105,130" stroke="#ffffff" strokeOpacity="0.4" fill="none" strokeWidth="1" />

      <polygon points="0,0 80,0 200,120 120,150" fill="#ffffff" fillOpacity="0.05" />
      <polygon points="400,0 320,0 200,120 280,150" fill="#ffffff" fillOpacity="0.05" />

      <path d="M 10 20 C 80 5, 120 5, 150 20" stroke="#ffffff" strokeWidth="3" strokeOpacity="0.4" strokeLinecap="round" />
      <circle cx="30" cy="16" r="2" fill="#ffffff" />
      <circle cx="60" cy="11" r="2" fill="#ffffff" />
      <circle cx="90" cy="9" r="2" fill="#ffffff" />
      <circle cx="120" cy="11" r="2" fill="#ffffff" />

      <path d="M 250 20 C 280 5, 320 5, 390 20" stroke="#ffffff" strokeWidth="3" strokeOpacity="0.4" strokeLinecap="round" />
      <circle cx="270" cy="11" r="2" fill="#ffffff" />
      <circle cx="300" cy="9" r="2" fill="#ffffff" />
      <circle cx="330" cy="11" r="2" fill="#ffffff" />
      <circle cx="360" cy="16" r="2" fill="#ffffff" />

      <circle cx="80" cy="40" r="1" fill="#ffffff" fillOpacity="0.8" />
      <circle cx="140" cy="30" r="1.5" fill="#ffffff" fillOpacity="0.5" />
      <circle cx="220" cy="25" r="1" fill="#ffffff" fillOpacity="0.9" />
      <circle cx="280" cy="35" r="1.2" fill="#ffffff" fillOpacity="0.6" />
      <circle cx="340" cy="45" r="1" fill="#ffffff" fillOpacity="0.7" />
    </svg>
  )
}

export default function StadiumsPage() {
  const [search, setSearch] = useState('')
  const [filterCountry, setFilterCountry] = useState<'ALL' | 'US' | 'MX' | 'CA'>('ALL')

  const filteredStadiums = STADIUMS.filter(stadium => {
    const matchesSearch =
      stadium.name.toLowerCase().includes(search.toLowerCase()) ||
      stadium.city.toLowerCase().includes(search.toLowerCase()) ||
      stadium.country.toLowerCase().includes(search.toLowerCase())

    const matchesCountry = filterCountry === 'ALL' || stadium.countryCode === filterCountry

    return matchesSearch && matchesCountry
  })

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-barlow font-black uppercase tracking-wide text-yellow-400">
              Estadios 🏟️
            </h1>
            <p className="text-gray-400 text-sm mt-1 font-sans">
              Las 16 sedes oficiales de la Copa Mundial de la FIFA 2026 en EE. UU., México y Canadá
            </p>
          </div>

          {/* Quick Stats Summary */}
          <div className="flex items-center gap-4 bg-gray-900/50 border border-gray-800/80 px-4 py-2.5 rounded-2xl text-xs text-gray-400 self-start md:self-auto font-sans">
            <div>
              <span className="text-gray-500 block uppercase font-bold tracking-wider">Capacidad Total</span>
              <span className="text-yellow-400 font-bold text-sm">
                {STADIUMS.reduce((sum, s) => sum + s.capacity, 0).toLocaleString()}
              </span>
            </div>
            <div className="w-px h-6 bg-gray-800" />
            <div>
              <span className="text-gray-500 block uppercase font-bold tracking-wider">Ciudades Sedes</span>
              <span className="text-yellow-400 font-bold text-sm">{STADIUMS.length}</span>
            </div>
            <div className="w-px h-6 bg-gray-800" />
            <div>
              <span className="text-gray-500 block uppercase font-bold tracking-wider">Países</span>
              <span className="text-yellow-400 font-bold text-sm">3</span>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8 font-sans">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm no-invert">🔍</span>
            <input
              type="text"
              placeholder="Buscar por nombre de estadio, ciudad o país..."
              className="w-full bg-gray-900 border border-gray-800/85 text-white pl-11 pr-4 py-3 rounded-2xl text-sm outline-none focus:border-yellow-400/50 transition-colors"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                { code: 'ALL', label: 'Todos' },
                { code: 'US', label: 'EE. UU. 🇺🇸' },
                { code: 'MX', label: 'México 🇲🇽' },
                { code: 'CA', label: 'Canadá 🇨🇦' },
              ] as const
            ).map(({ code, label }) => (
              <button
                key={code}
                onClick={() => setFilterCountry(code)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                  filterCountry === code
                    ? 'bg-yellow-400 text-gray-950 shadow-md shadow-yellow-500/10'
                    : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Stadiums Grid */}
        {filteredStadiums.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredStadiums.map(stadium => (
              <div
                key={stadium.name}
                className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden group hover:border-yellow-400/40 transition-all duration-300 flex flex-col shadow-xl"
              >
                {/* Illustration card with gradient country style */}
                <div className="relative h-44 overflow-hidden bg-gray-950 flex items-center justify-center">
                  <StadiumSvg countryCode={stadium.countryCode} />

                  {/* Badges on top of illustration */}
                  <span className="absolute top-3 right-3 bg-gray-950/80 backdrop-blur px-2.5 py-1 rounded-full text-xs font-black border border-gray-800/50 flex items-center gap-1.5 no-invert font-sans">
                    {FLAG_MAP[stadium.countryCode]} {COUNTRY_NAME_MAP[stadium.countryCode]}
                  </span>

                  <span className="absolute bottom-3 left-3 bg-gray-950/85 backdrop-blur px-3 py-1.5 rounded-xl text-xs font-bold border border-gray-800/60 text-gray-200 max-w-[90%] truncate font-sans">
                    📍 {stadium.city}
                  </span>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <h3 className="font-barlow font-black text-xl text-white tracking-wide uppercase group-hover:text-yellow-400 transition-colors duration-200">
                      {stadium.name}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-2 pt-2 border-t border-gray-800/70 font-sans">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span className="text-base no-invert">👥</span>
                      <div>
                        <span className="text-xs text-gray-500 block uppercase tracking-wider font-semibold">
                          Capacidad
                        </span>
                        <span className="font-bold text-white">
                          {stadium.capacity.toLocaleString()} espectadores
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-sm text-gray-400 mt-1">
                      <span className="text-base mt-0.5 no-invert">⚽</span>
                      <div>
                        <span className="text-xs text-gray-500 block uppercase tracking-wider font-semibold">
                          Partidos Asignados
                        </span>
                        <span className="font-medium text-gray-200 block text-xs mt-0.5 leading-snug">
                          {stadium.matches}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-3xl font-sans">
            <span className="text-4xl block mb-3 no-invert">🔎</span>
            <h3 className="text-lg font-bold text-white mb-1">No se encontraron estadios</h3>
            <p className="text-gray-400 text-sm">
              Intenta cambiar la búsqueda o el filtro de país.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
