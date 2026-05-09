import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Home, Compass, Camera, BookOpen, User, LogIn } from 'lucide-react'
import { useAuth } from '../hooks/useAuthContext'

const navItems = [
  { to: '/', icon: Home, label: 'Feed' },
  { to: '/map', icon: Compass, label: 'Map' },
  { to: '/identify', icon: Camera, label: 'Identify' },
  { to: '/collection', icon: BookOpen, label: 'Collection' },
]

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: '#000' }}>
      {/* Top header */}
      <header style={{ background: '#0a0a0a', borderBottom: '1px solid #222', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 768, margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <NavLink to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>💎</span>
            <span style={{ fontWeight: 700, fontSize: 18, color: '#8b5cf6', letterSpacing: '-0.5px' }}>iCrystal.OS</span>
          </NavLink>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {user ? (
              <>
                <button
                  onClick={() => navigate('/profile')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', color: '#a3a3a3' }}
                  title="Profile"
                >
                  <User size={20} />
                </button>
                <button
                  onClick={signOut}
                  style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '6px 14px', color: '#a3a3a3', cursor: 'pointer', fontSize: 13 }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/login')}
                style={{ background: '#7c3aed', border: 'none', borderRadius: 8, padding: '6px 14px', color: '#fff', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <LogIn size={14} /> Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main style={{ flex: 1, maxWidth: 768, width: '100%', margin: '0 auto', padding: '16px', paddingBottom: 80 }}>
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0a0a0a', borderTop: '1px solid #222', zIndex: 50, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div style={{ maxWidth: 768, margin: '0 auto', display: 'grid', gridTemplateColumns: `repeat(${navItems.length}, 1fr)` }}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: '10px 0',
                textDecoration: 'none',
                color: isActive ? '#8b5cf6' : '#525252',
                fontSize: 11,
                fontWeight: isActive ? 600 : 400,
                transition: 'color 0.15s',
              })}
            >
              <Icon size={22} strokeWidth={to === '/identify' ? 2 : 1.5} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
