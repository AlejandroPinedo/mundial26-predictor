import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppShell from './components/AppShell'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import RulesPage from './pages/RulesPage'
import HomePage from './pages/HomePage'
import MatchesPage from './pages/MatchesPage'
import MyPredictionsPage from './pages/MyPredictionsPage'
import LeaderboardPage from './pages/LeaderboardPage'
import ProfilePage from './pages/ProfilePage'
import GroupsPage from './pages/GroupsPage'
import GroupLeaderboardPage from './pages/GroupLeaderboardPage'
import AdminPage from './pages/AdminPage'
import BracketPage from './pages/BracketPage'
import TeamsPage from './pages/TeamsPage'
import CalendarPage from './pages/CalendarPage'

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
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
              style: { background: '#1f2937', color: '#fff', border: '1px solid #374151' },
              success: { iconTheme: { primary: '#facc15', secondary: '#111827' } },
            }}
          />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/rules" element={<RulesPage />} />
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
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
