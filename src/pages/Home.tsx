import { useState, useEffect } from 'react'
import { Sparkles, TrendingUp, Clock } from 'lucide-react'
import SpecimenCard from '../components/SpecimenCard'
import type { Specimen } from '../types'
import { supabase } from '../lib/supabase'

type Tab = 'recent' | 'trending'

const DEMO_SPECIMENS: Specimen[] = [
  {
    id: '1', user_id: 'u1',
    user: { id: 'u1', username: 'crystalhunter', display_name: 'Crystal Hunter', avatar_url: null },
    mineral_name: 'Amethyst', mineral_group: 'Quartz', variety: 'Chevron',
    locality: 'Thunder Bay', locality_country: 'Canada',
    lat: 48.4, lng: -89.3, obfuscated_lat: 48.3, obfuscated_lng: -89.2,
    location_precision: 10,
    description: 'Beautiful purple amethyst with characteristic chevron banding. Found in a vein deposit.',
    crystal_system: 'Trigonal', luster: 'Vitreous', color: 'Purple', hardness: 7,
    photos: [], is_public: true, quality_grade: 'research', ai_identified: true,
    like_count: 24, comment_count: 5, created_at: new Date(Date.now() - 3600000).toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: '2', user_id: 'u2',
    user: { id: 'u2', username: 'gemologist_jane', display_name: 'Jane Doe', avatar_url: null },
    mineral_name: 'Malachite', mineral_group: 'Carbonates', variety: null,
    locality: 'Kolwezi', locality_country: 'DR Congo',
    lat: -10.7, lng: 25.5, obfuscated_lat: -10.8, obfuscated_lng: 25.4,
    location_precision: 10,
    description: 'Banded malachite with rich green concentric rings. Primary copper carbonate.',
    crystal_system: 'Monoclinic', luster: 'Silky', color: 'Green', hardness: 3.5,
    photos: [], is_public: true, quality_grade: 'community', ai_identified: false,
    like_count: 17, comment_count: 3, created_at: new Date(Date.now() - 7200000).toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: '3', user_id: 'u3',
    user: { id: 'u3', username: 'rockhound99', display_name: 'Rock Hound', avatar_url: null },
    mineral_name: 'Fluorite', mineral_group: 'Halides', variety: 'Rainbow',
    locality: 'Cave-in-Rock', locality_country: 'USA',
    lat: 37.5, lng: -88.2, obfuscated_lat: 37.4, obfuscated_lng: -88.3,
    location_precision: 10,
    description: 'Multicolored fluorite octahedra with green, purple and clear zones.',
    crystal_system: 'Isometric', luster: 'Vitreous', color: 'Multicolor', hardness: 4,
    photos: [], is_public: true, quality_grade: 'needs_id', ai_identified: false,
    like_count: 9, comment_count: 1, created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date().toISOString(),
  },
]

export default function Home() {
  const [tab, setTab] = useState<Tab>('recent')
  const [specimens, setSpecimens] = useState<Specimen[]>(DEMO_SPECIMENS)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('specimens')
          .select('*, user:profiles(id,username,display_name,avatar_url), photos:specimen_photos(*)')
          .eq('is_public', true)
          .order(tab === 'trending' ? 'like_count' : 'created_at', { ascending: false })
          .limit(20)
        if (data && data.length > 0) setSpecimens(data as Specimen[])
      } catch {
        /* use demo data */
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tab])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#f5f5f5' }}>
            <Sparkles size={20} style={{ color: '#7c3aed', marginRight: 8, verticalAlign: 'middle' }} />
            Discoveries
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#525252' }}>Latest crystal finds from the community</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 10, padding: 4, marginBottom: 20 }}>
        {([['recent', <Clock size={14} />, 'Recent'], ['trending', <TrendingUp size={14} />, 'Trending']] as const).map(([t, icon, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: tab === t ? '#7c3aed' : 'transparent',
              border: 'none', borderRadius: 7, padding: '8px', cursor: 'pointer',
              color: tab === t ? '#fff' : '#525252', fontSize: 13, fontWeight: tab === t ? 600 : 400,
              transition: 'all 0.15s',
            }}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 12, height: 280, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {specimens.map(s => <SpecimenCard key={s.id} specimen={s} />)}
        </div>
      )}
    </div>
  )
}
