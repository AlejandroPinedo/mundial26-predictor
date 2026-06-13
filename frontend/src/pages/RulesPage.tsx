import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'

const sections = [
  {
    icon: '⚽',
    title: 'Fase de Grupos',
    color: 'text-us',
    dot: 'bg-us',
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
    color: 'text-gold',
    dot: 'bg-gold',
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
    color: 'text-ca',
    dot: 'bg-ca',
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
    color: 'text-mx',
    dot: 'bg-mx',
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
    color: 'text-us',
    dot: 'bg-us',
    items: [
      'El Calendario organiza todos los partidos por fecha con filtros interactivos.',
      'Puedes predecir directamente desde la vista de calendario.',
      'La página de Estadios muestra los 16 recintos del Mundial 2026 en USA, México y Canadá.',
      'Cada estadio indica la ciudad, capacidad y partidos que albergará.',
    ],
  },
  {
    icon: '🐟',
    title: 'Pez Oráculo (predicción del modelo)',
    color: 'text-gold',
    dot: 'bg-gold',
    items: [
      'En cada partido por jugar, el Pez Oráculo muestra su pronóstico: probabilidad de victoria local, empate o visita.',
      'Toca "Análisis" para desplegar el marcador más probable, los 3 marcadores más probables y los goles esperados (xG).',
      'Es un modelo estadístico (Poisson + Dixon-Coles) entrenado con ~45 000 partidos internacionales: calcula probabilidades, no adivina.',
      'Su pronóstico se ajusta solo con los resultados que van ocurriendo en el Mundial.',
      'Ojo: el marcador más probable (p. ej. 1-1) puede no coincidir con el favorito a ganar, porque una victoria reúne muchos marcadores distintos y suma más que cualquier marcador puntual.',
    ],
  },
]

export default function RulesPage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-ink-950 text-white font-sans">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
        {!user && (
          <Link to="/"
            className="inline-flex items-center gap-1.5 text-gold text-[11px] font-condensed font-extrabold uppercase tracking-[0.14em] hover:underline mb-6">
            <Icon name="chevronLeft" size={14} />
            Volver al inicio
          </Link>
        )}

        <PageHeader title="GUÍA DEL JUEGO" subtitle="Sistema de puntos y reglas" icon="📖" />

        {/* ── 01 · Puntos — Fase de Grupos ───────────────────────── */}
        <section className="relative overflow-hidden bg-panel border border-white/8 rounded-2xl p-6 mb-4 fade-up-1">
          <span className="absolute -top-4 right-2 font-display text-8xl text-white/[0.03] select-none" aria-hidden="true">01</span>
          <div className="relative z-10">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-2xl text-gold leading-none">01</span>
              <h2 className="font-condensed font-extrabold text-sm md:text-base text-white uppercase tracking-[0.12em]">
                Sistema de puntos — Fase de Grupos
              </h2>
            </div>
            <div className="tri-stripe w-16 rounded-full my-4" aria-hidden="true" />
            <div className="flex flex-col gap-3">
              {[
                { pts: '3', label: 'Marcador exacto', desc: 'Predijiste 2-1 y terminó 2-1', color: 'text-gold', chip: 'text-gold border-gold/30 bg-gold/10' },
                { pts: '1', label: 'Resultado correcto', desc: 'Predijiste 2-1 y terminó 3-0 (ganó el mismo equipo)', color: 'text-mx', chip: 'text-mx border-mx/30 bg-mx/10' },
                { pts: '0', label: 'Resultado incorrecto', desc: 'Te equivocaste en quién ganó o empate', color: 'text-gray-500', chip: 'text-gray-400' },
              ].map(({ pts, label, desc, color, chip }) => (
                <div key={label} className="flex items-center gap-4 bg-ink-900 border border-white/6 rounded-xl px-4 py-3">
                  <div className="w-12 flex-shrink-0 text-center">
                    <span className={`font-display text-3xl leading-none ${color}`}>{pts}</span>
                  </div>
                  <div className="w-px self-stretch bg-white/6 flex-shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-condensed font-extrabold text-sm text-white uppercase tracking-wide">{label}</p>
                      <span className={`chip ${chip}`}>{pts} pts</span>
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 02 · Puntos — Playoffs ─────────────────────────────── */}
        <section className="relative overflow-hidden bg-panel border border-white/8 rounded-2xl p-6 mb-6 fade-up-2">
          <span className="absolute -top-4 right-2 font-display text-8xl text-white/[0.03] select-none" aria-hidden="true">02</span>
          <div className="relative z-10">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-2xl text-gold leading-none">02</span>
              <h2 className="font-condensed font-extrabold text-sm md:text-base text-white uppercase tracking-[0.12em]">
                Sistema de puntos — Playoffs
              </h2>
            </div>
            <div className="tri-stripe w-16 rounded-full my-4" aria-hidden="true" />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { round: 'Ronda de 32', pts: '1', icon: '⚽' },
                { round: 'Cuartos', pts: '2', icon: '🔥' },
                { round: 'Semifinal', pts: '4', icon: '⭐' },
                { round: 'Finalista', pts: '6', icon: '🥈' },
                { round: 'Campeón', pts: '10', icon: '🏆' },
              ].map(({ round, pts, icon }) => (
                <div key={round} className="bg-ink-900 border border-white/6 rounded-xl p-3 text-center hover-lift">
                  <div className="text-2xl mb-2 no-invert">{icon}</div>
                  <div className="font-display text-3xl text-gold leading-none">{pts}</div>
                  <span className="chip text-gray-400 mt-2">pts c/u</span>
                  <div className="text-gray-300 text-[11px] font-condensed font-extrabold uppercase tracking-wide mt-2">{round}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Separador editorial ────────────────────────────────── */}
        <div className="flex items-center gap-4 mb-6">
          <div className="tri-stripe flex-1 rounded-full opacity-50" aria-hidden="true" />
          <span className="font-condensed font-extrabold text-[10px] uppercase tracking-[0.24em] text-gray-500">Cómo se juega</span>
          <div className="tri-stripe flex-1 rounded-full opacity-50" aria-hidden="true" />
        </div>

        {/* ── 03–07 · Secciones de la guía ───────────────────────── */}
        <div className="grid md:grid-cols-2 gap-4 mb-6 fade-up-3">
          {sections.map((section, idx) => (
            <section key={section.title} className="bg-panel border border-white/8 rounded-2xl p-5">
              <div className="flex items-baseline gap-3 mb-3">
                <span className={`font-display text-xl leading-none ${section.color}`}>
                  {String(idx + 3).padStart(2, '0')}
                </span>
                <h2 className="font-condensed font-extrabold text-sm text-white uppercase tracking-[0.1em]">
                  <span className="no-invert mr-1.5">{section.icon}</span>
                  {section.title}
                </h2>
              </div>
              <ul className="flex flex-col gap-2">
                {section.items.map((item, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-gray-400">
                    <span className={`mt-[7px] w-1.5 h-1.5 rounded-full flex-shrink-0 ${section.dot}`} aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {/* ── Tips para ganar ────────────────────────────────────── */}
        <section className="bg-gold/5 border border-gold/25 rounded-2xl p-6 fade-up-4">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="zap" size={16} className="text-gold" />
            <h2 className="font-condensed font-extrabold text-sm text-gold uppercase tracking-[0.14em]">
              Tips para ganar
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-300">
            {[
              'Predice todos los partidos antes del 11 de junio para no perder ninguno.',
              'El bracket de playoffs vale más puntos por acierto — ponle atención.',
              'Crea un grupo privado para competir directamente contra tus amigos.',
              'Consulta el Pez Oráculo antes de predecir: te da las probabilidades del partido (aunque la sorpresa siempre suma más puntos).',
            ].map((tip, i) => (
              <div key={i} className="flex gap-3">
                <span className="font-display text-2xl text-gold/40 leading-none flex-shrink-0">{i + 1}</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </section>

        {user && (
          <div className="mt-8 text-center">
            <Link to="/matches" className="btn-gold">
              Ir a predecir
              <Icon name="chevronRight" size={15} />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
