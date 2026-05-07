import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import Home from './pages/Home'
import Identify from './pages/Identify'
import Collection from './pages/Collection'
import MapPage from './pages/Map'
import SpecimenDetail from './pages/SpecimenDetail'
import Profile from './pages/Profile'
import Auth from './pages/Auth'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#000' }}>
        <div style={{ color: '#8b5cf6' }} className="animate-pulse text-lg">Loading…</div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/specimen/:id" element={<SpecimenDetail />} />
        <Route path="/profile/:username" element={<Profile />} />
        <Route
          path="/identify"
          element={<ProtectedRoute><Identify /></ProtectedRoute>}
        />
        <Route
          path="/collection"
          element={<ProtectedRoute><Collection /></ProtectedRoute>}
        />
      </Route>
      <Route path="/login" element={<Auth mode="login" />} />
      <Route path="/signup" element={<Auth mode="signup" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
