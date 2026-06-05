import { Link } from 'react-router-dom'

export default function RulesPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto p-6">
        <Link to="/" className="text-yellow-400 text-sm hover:underline mb-6 inline-block">
          ← Volver al inicio
        </Link>

        <h1 className="text-3xl font-black text-yellow-400 mb-2">Cómo jugar</h1>
        <p className="text-gray-400 mb-8">Todo lo que necesitas saber para ganar.</p>

        <div className="flex flex-col gap-6">
          <div className="bg-gray-900 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Sistema de puntos</h2>
            <div className="flex flex-col gap-3">
              {[
                { pts: '3', label: 'Marcador exacto', desc: 'Predijiste 2-1 y terminó 2-1', color: 'bg-green-700 text-green-200' },
                { pts: '1', label: 'Resultado correcto', desc: 'Predijiste 2-1 y terminó 3-0 (ganó el mismo equipo)', color: 'bg-blue-700 text-blue-200' },
                { pts: '0', label: 'Resultado incorrecto', desc: 'Te equivocaste en quién ganó', color: 'bg-gray-700 text-gray-300' },
              ].map(({ pts, label, desc, color }) => (
                <div key={label} className="flex items-start gap-4">
                  <span className={`${color} text-2xl font-black px-3 py-1 rounded-lg min-w-12 text-center`}>
                    {pts}
                  </span>
                  <div>
                    <p className="font-bold">{label}</p>
                    <p className="text-gray-500 text-sm">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Reglas importantes</h2>
            <ul className="flex flex-col gap-3 text-gray-300">
              {[
                'Debes predecir antes de que comience el partido — una vez que inicia, se bloquea tu predicción.',
                'Puedes cambiar tu predicción las veces que quieras antes del inicio.',
                'Los puntos se calculan automáticamente cuando se carga el resultado.',
                'El leaderboard global muestra a todos los jugadores.',
                'Los grupos privados tienen su propio ranking independiente.',
              ].map((rule, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-yellow-400 font-bold">{i + 1}.</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gray-900 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Grupos privados</h2>
            <p className="text-gray-400 text-sm mb-4">
              Compite con tus amigos en un ranking privado. Los puntos son los mismos del global — solo cambia que ves solo a tu grupo.
            </p>
            <ol className="flex flex-col gap-2 text-sm text-gray-300">
              <li><span className="text-yellow-400">1.</span> Ve a <strong>Grupos</strong> en el menú</li>
              <li><span className="text-yellow-400">2.</span> Crea un grupo con el nombre que quieras</li>
              <li><span className="text-yellow-400">3.</span> Comparte el código de 6 letras con tus amigos</li>
              <li><span className="text-yellow-400">4.</span> Ellos ingresan el código en "Unirse con código"</li>
            </ol>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link to="/register"
            className="bg-yellow-400 text-gray-950 font-black px-8 py-3 rounded-xl hover:bg-yellow-300 transition inline-block">
            Jugar gratis
          </Link>
        </div>
      </div>
    </div>
  )
}
