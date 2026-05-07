import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Props { mode: 'login' | 'signup' }

export default function Auth({ mode }: Props) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
        if (error) throw error
        setSuccess('Check your email to confirm your account!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate('/')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleOAuth = async (provider: 'google' | 'github') => {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } })
      if (error) throw error
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'OAuth failed')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>💎</div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#f5f5f5' }}>iCrystal.OS</h1>
          <p style={{ margin: '6px 0 0', color: '#525252', fontSize: 14 }}>
            {mode === 'login' ? 'Welcome back, rockhound' : 'Join the crystal community'}
          </p>
        </div>

        <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 16, padding: 24 }}>
          {/* OAuth buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {[['Google', '🌐'], ['GitHub', '🐙']].map(([provider, icon]) => (
              <button
                key={provider}
                onClick={() => handleOAuth(provider.toLowerCase() as 'google' | 'github')}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', background: '#111', border: '1px solid #222', borderRadius: 10, padding: '12px', color: '#f5f5f5', cursor: 'pointer', fontSize: 14, transition: 'all 0.15s' }}
              >
                <span>{icon}</span> Continue with {provider}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: '#1a1a1a' }} />
            <span style={{ color: '#525252', fontSize: 12 }}>or</span>
            <div style={{ flex: 1, height: 1, background: '#1a1a1a' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#a3a3a3', marginBottom: 6 }}>Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#525252' }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 8, padding: '11px 12px 11px 34px', color: '#f5f5f5', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#a3a3a3', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#525252' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 8, padding: '11px 40px 11px 34px', color: '#f5f5f5', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                />
                <button type="button" onClick={() => setShowPassword(s => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#525252', cursor: 'pointer', display: 'flex', padding: 0 }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <p style={{ margin: 0, color: '#ef4444', fontSize: 13, background: '#1a0a0a', border: '1px solid #4a1a1a', borderRadius: 6, padding: '8px 10px' }}>{error}</p>}
            {success && <p style={{ margin: 0, color: '#10b981', fontSize: 13, background: '#0a1a0a', border: '1px solid #1a4a1a', borderRadius: 6, padding: '8px 10px' }}>{success}</p>}

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', background: loading ? '#333' : 'linear-gradient(135deg, #7c3aed, #06b6d4)', border: 'none', borderRadius: 10, padding: '13px', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}
            >
              {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 16, color: '#525252', fontSize: 14 }}>
          {mode === 'login' ? <>No account? <Link to="/signup" style={{ color: '#7c3aed' }}>Sign up</Link></> : <>Have an account? <Link to="/login" style={{ color: '#7c3aed' }}>Sign in</Link></>}
        </p>
        <p style={{ textAlign: 'center', marginTop: 6 }}>
          <Link to="/" style={{ color: '#525252', fontSize: 13, textDecoration: 'none' }}>← Back to feed</Link>
        </p>
      </div>
    </div>
  )
}
