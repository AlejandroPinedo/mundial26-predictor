import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppShell from './components/AppShell'
import Spinner from './components/Spinner'

// Eager — needed immediately on first load
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import OAuthCallbackPage from './pages/OAuthCallbackPage'

// Lazy — loaded only when navigated to
const RulesPage = lazy(() => import('./pages/RulesPage'))
const HomePage = lazy(() => import('./pages/HomePage'))
const MatchesPage = lazy(() => import('./pages/MatchesPage'))
const MyPredictionsPage = lazy(() => import('./pages/MyPredictionsPage'))
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const GroupsPage = lazy(() => import('./pages/GroupsPage'))
const GroupLeaderboardPage = lazy(() => import('./pages/GroupLeaderboardPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const BracketPage = lazy(() => import('./pages/BracketPage'))
const TeamsPage = lazy(() => import('./pages/TeamsPage'))
const CalendarPage = lazy(() => import('./pages/CalendarPage'))
const StadiumsPage = lazy(() => import('./pages/StadiumsPage'))
const ComparePage = lazy(() => import('./pages/ComparePage'))
const StatsPage = lazy(() => import('./pages/StatsPage'))
const StandingsPage = lazy(() => import('./pages/StandingsPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function PageLoader() {
  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center">
      <Spinner />
    </div>
  )
}

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppShell>
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
      </AppShell>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#18142A',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                fontFamily: "'Outfit', sans-serif",
              },
              success: { iconTheme: { primary: '#FFC300', secondary: '#07060E' } },
              error: { iconTheme: { primary: '#FF3B5C', secondary: '#07060E' } },
            }}
          />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/rules" element={<RulesPage />} />
              <Route path="/auth/callback" element={<OAuthCallbackPage />} />
              <Route path="/home" element={<Protected><HomePage /></Protected>} />
              <Route path="/matches" element={<Protected><MatchesPage /></Protected>} />
              <Route path="/my" element={<Protected><MyPredictionsPage /></Protected>} />
              <Route path="/leaderboard" element={<Protected><LeaderboardPage /></Protected>} />
              <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />
              <Route path="/groups" element={<Protected><GroupsPage /></Protected>} />
              <Route path="/groups/:id" element={<Protected><GroupLeaderboardPage /></Protected>} />
              <Route path="/admin" element={<Protected><AdminPage /></Protected>} />
              <Route path="/bracket" element={<Protected><BracketPage /></Protected>} />
              <Route path="/teams" element={<Protected><TeamsPage /></Protected>} />
              <Route path="/calendar" element={<Protected><CalendarPage /></Protected>} />
              <Route path="/stadiums" element={<Protected><StadiumsPage /></Protected>} />
              <Route path="/compare/:username" element={<Protected><ComparePage /></Protected>} />
              <Route path="/stats" element={<Protected><StatsPage /></Protected>} />
              <Route path="/standings" element={<Protected><StandingsPage /></Protected>} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
