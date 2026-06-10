import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/PageHeader'

const sections = [
  {
    icon: '⚽',
    title: 'Fase de Grupos',
    color: 'text-blue-400',
    border: 'border-blue-500/30',
    items: [
      'Predice el marcador exacto de cada partido antes de que empiece.',
      'Una vez iniciado el partido, tu predicción queda bloqueada.',
      'Puedes actualizar tu predicción cuantas veces quieras antes del pitazo inicial.',
      'Los puntos se calculan automáticamente al registrar el resultado oficial.',
    ],
  },
  {
    icon: '🏆',
    title: 'Bracket de Playoffs',
    color: 'text-yellow-400',
    border: 'border-yellow-500/30',
    items: [
      'Predice qué equipos llegarán a la Ronda de 32, Cuartos, Semifinal, Final y el Campeón.',
      'Cada ronda solo muestra los equipos que elegiste en la ronda anterior.',
      'Los puntos por playoff son independientes de la fase de grupos.',
      'Puedes exportar tu bracket como imagen para compartir.',
    ],
  },
  {
    icon: '👥',
    title: 'Grupos Privados',
    color: 'text-purple-400',
    border: 'border-purple-500/30',
    items: [
      'Crea tu propia liga privada y comparte el código de 6 caracteres con tus amigos.',
      'Cada grupo tiene su propio ranking independiente del global.',
      'El leaderboard del grupo incluye puntos de fase de grupos y de playoffs.',
      'Los miembros pueden chatear en el muro del grupo en tiempo real.',
      'Compara tus predicciones cara a cara contra cualquier miembro del grupo.',
    ],
  },
  {
    icon: '📊',
    title: 'Estadísticas y Comunidad',
    color: 'text-green-400',
    border: 'border-green-500/30',
    items: [
      'La página de Estadísticas muestra los insights globales de la comunidad.',
      'Descubre qué equipos son los favoritos para ganar entre todos los usuarios.',
      'Ve cuántos usuarios predijeron cada resultado y cómo se distribuyen los puntos.',
      'Tu perfil muestra tu posición en el ranking, % de aciertos y puntos totales.',
    ],
  },
  {
    icon: '📅',
    title: 'Calendario y Sedes',
    color: 'text-orange-400',
    border: 'border-orange-500/30',
    items: [
      'El Calendario organiza todos los partidos por fecha con filtros interactivos.',
      'Puedes predecir directamente desde la vista de calendario.',
      'La página de Estadios muestra los 16 recintos del Mundial 2026 en USA, México y Canadá.',
      'Cada estadio indica la ciudad, capacidad y partidos que albergará.',
    ],
  },
]

export default function RulesPage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-[#020817] text-white">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {!user && (
          <Link to="/" className="text-yellow-400 text-sm hover:underline mb-6 inline-block font-semibold">
            ← Volver al inicio
          </Link>
        )}

        <PageHeader title="GUÍA DEL JUEGO" subtitle="Sistema de puntos y reglas" icon="📖" />

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-displayr text-yellow-400 mb-4">
            Sistema de puntos — Fase de Grupos
          </h2>
          <div className="flex flex-col gap-3 mb-4">
            {[
              { pts: '3', label: 'Marcador exacto', desc: 'Predijiste 2-1 y terminó 2-1', color: 'bg-green-700/80 text-green-100 border border-green-600' },
              { pts: '1', label: 'Resultado correcto', desc: 'Predijiste 2-1 y terminó 3-0 (ganó el mismo equipo)', color: 'bg-blue-700/80 text-blue-100 border border-blue-600' },
              { pts: '0', label: 'Resultado incorrecto', desc: 'Te equivocaste en quién ganó o empate', color: 'bg-gray-700/80 text-gray-300 border border-gray-600' },
            ].map(({ pts, label, desc, color }) => (
              <div key={label} className="flex items-center gap-4">
                <span className={`${color} text-2xl font-barlow font-black px-3 py-1 rounded-xl min-w-[52px] text-center flex-shrink-0`}>
                  {pts}
                </span>
                <div>
                  <p className="font-bold text-sm">{label}</p>
                  <p className="text-gray-500 text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-displayr text-yellow-400 mb-4">
            Sistema de puntos — Playoffs
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { round: 'Ronda de 32', pts: '1', icon: '⚽' },
              { round: 'Cuartos', pts: '2', icon: '🔥' },
              { round: 'Semifinal', pts: '4', icon: '⭐' },
              { round: 'Finalista', pts: '6', icon: '🥈' },
              { round: 'Campeón', pts: '10', icon: '🏆' },
            ].map(({ round, pts, icon }) => (
              <div key={round} className="bg-gray-950 border border-gray-800 rounded-xl p-3 text-center">
                <div className="text-2xl mb-1">{icon}</div>
                <div className="text-yellow-400 font-black text-xl">{pts}</div>
                <div className="text-gray-500 text-xs">pts c/u</div>
                <div className="text-gray-400 text-xs font-bold mt-1">{round}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {sections.map(section => (
            <div key={section.title} className={`bg-gray-900 border ${section.border} rounded-2xl p-5`}>
              <h2 className={`font-displayr text-base mb-3 ${section.color}`}>
                {section.icon} {section.title}
              </h2>
              <ul className="flex flex-col gap-2">
                {section.items.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-400">
                    <span className={`${section.color} font-bold flex-shrink-0`}>·</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-5">
          <h2 className="font-displayr text-yellow-400 mb-3">
            💡 Tips para ganar
          </h2>
          <div className="grid md:grid-cols-3 gap-3 text-sm text-gray-300">
            {[
              'Predice todos los partidos antes del 11 de junio para no perder ninguno.',
              'El bracket de playoffs vale más puntos por acierto — ponle atención.',
              'Crea un grupo privado para competir directamente contra tus amigos.',
            ].map((tip, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-yellow-400 font-bold">{i + 1}.</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>

        {user && (
          <div className="mt-6 text-center">
            <Link to="/matches"
              className="bg-yellow-400 text-gray-950 font-black px-8 py-3 rounded-xl hover:bg-yellow-300 transition inline-block">
              Ir a predecir →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
