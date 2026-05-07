import { useState, useEffect } from 'react'
import { Plus, Search, Grid2x2, List, Lock, Globe } from 'lucide-react'
import { Link } from 'react-router-dom'
import SpecimenCard from '../components/SpecimenCard'
import type { Specimen } from '../types'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const DEMO: Specimen[] = [
  {
    id: '10', user_id: 'me',
    user: { id: 'me', username: 'you', display_name: 'You', avatar_url: null },
    mineral_name: 'Tourmaline', mineral_group: 'Cyclosilicates', variety: 'Rubellite',
    locality: 'Minas Gerais', locality_country: 'Brazil',
    lat: -19.9, lng: -44.0, obfuscated_lat: -19.8, obfuscated_lng: -44.1,
    location_precision: 10, description: 'Deep pink tourmaline crystal.',
    crystal_system: 'Trigonal', luster: 'Vitreous', color: 'Pink', hardness: 7.5,
    photos: [], is_public: true, quality_grade: 'research', ai_identified: true,
    like_count: 5, comment_count: 2, created_at: new Date(Date.now() - 86400000 * 2).toISOString(), updated_at: new Date().toISOString(),
  },
]

export default function Collection() {
  const { user } = useAuth()
  const [specimens, setSpecimens] = useState<Specimen[]>(DEMO)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [filterPublic, setFilterPublic] = useState<'all' | 'public' | 'private'>('all')

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('specimens')
          .select('*, photos:specimen_photos(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        if (data && data.length > 0) setSpecimens(data as Specimen[])
      } catch { /* use demo */ }
      finally { setLoading(false) }
    }
    load()
  }, [user])

  const filtered = specimens.filter(s => {
    const matchQ = !query || s.mineral_name.toLowerCase().includes(query.toLowerCase()) || s.locality?.toLowerCase().includes(query.toLowerCase())
    const matchP = filterPublic === 'all' || (filterPublic === 'public' && s.is_public) || (filterPublic === 'private' && !s.is_public)
    return matchQ && matchP
  })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#f5f5f5' }}>My Collection</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#525252' }}>{specimens.length} specimens</p>
        </div>
        <Link to="/identify" style={{
          display: 'flex', alignItems: 'center', gap: 6, background: '#7c3aed',
          border: 'none', borderRadius: 10, padding: '10px 14px', color: '#fff',
          textDecoration: 'none', fontSize: 14, fontWeight: 600,
        }}>
          <Plus size={16} /> Add
        </Link>
      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#525252', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search minerals…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, padding: '10px 10px 10px 32px', color: '#f5f5f5', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <button onClick={() => setView(v => v === 'grid' ? 'list' : 'grid')} style={{ background: '#111', border: '1px solid #222', borderRadius: 8, padding: '0 12px', color: '#a3a3a3', cursor: 'pointer' }}>
          {view === 'grid' ? <List size={18} /> : <Grid2x2 size={18} />}
        </button>
      </div>

      {/* Visibility filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {([['all', 'All', null], ['public', 'Public', Globe], ['private', 'Private', Lock]] as const).map(([val, label, Icon]) => (
          <button
            key={val}
            onClick={() => setFilterPublic(val)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: filterPublic === val ? '#7c3aed' : '#111',
              border: `1px solid ${filterPublic === val ? '#7c3aed' : '#222'}`,
              borderRadius: 8, padding: '6px 12px', color: filterPublic === val ? '#fff' : '#a3a3a3',
              cursor: 'pointer', fontSize: 13, transition: 'all 0.15s',
            }}
          >
            {Icon && <Icon size={13} />} {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#525252' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>💎</div>
          <div style={{ color: '#f5f5f5', fontWeight: 600, marginBottom: 6 }}>No specimens yet</div>
          <div style={{ color: '#525252', fontSize: 14, marginBottom: 20 }}>Start by identifying your first crystal</div>
          <Link to="/identify" style={{ background: '#7c3aed', borderRadius: 10, padding: '10px 20px', color: '#fff', textDecoration: 'none', fontWeight: 600 }}>
            Identify a Specimen
          </Link>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: view === 'grid' ? 'repeat(2, 1fr)' : '1fr',
          gap: 12,
        }}>
          {filtered.map(s => <SpecimenCard key={s.id} specimen={s} compact={view === 'grid'} />)}
        </div>
      )}
    </div>
  )
}
