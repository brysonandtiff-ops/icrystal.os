import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { useAuth } from './hooks/useAuthContext'
import Layout from './components/Layout'

const Home = lazy(() => import('./pages/Home'))
const Identify = lazy(() => import('./pages/Identify'))
const Collection = lazy(() => import('./pages/Collection'))
const MapPage = lazy(() => import('./pages/Map'))
const SpecimenDetail = lazy(() => import('./pages/SpecimenDetail'))
const Profile = lazy(() => import('./pages/Profile'))
const Auth = lazy(() => import('./pages/Auth'))

function AppLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: '#000' }}>
      <div style={{ color: '#8b5cf6' }} className="animate-pulse text-lg">Loading…</div>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return <AppLoader />
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
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
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
      <Suspense fallback={<AppLoader />}>
        <AppRoutes />
      </Suspense>
    </AuthProvider>
  )
}
