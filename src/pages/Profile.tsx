import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapPin, Calendar, UserPlus, UserMinus } from 'lucide-react'
import { format } from 'date-fns'
import SpecimenCard from '../components/SpecimenCard'
import type { User, Specimen } from '../types'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const DEMO_USER: User = {
  id: 'u1', email: 'crystalhunter@example.com', username: 'crystalhunter',
  display_name: 'Crystal Hunter', avatar_url: null,
  bio: 'Amateur mineralogist. Collecting since 2010. Specializing in quartz varieties and fluorescent minerals.',
  location: 'Ontario, Canada', specimen_count: 47, follower_count: 128, following_count: 64,
  created_at: new Date('2021-03-15').toISOString(),
}

export default function Profile() {
  const { username } = useParams()
  const { user: authUser } = useAuth()
  const [profile, setProfile] = useState<User>(DEMO_USER)
  const [specimens, setSpecimens] = useState<Specimen[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(false)

  const isOwnProfile = authUser && profile.id === authUser.id

  useEffect(() => {
    const load = async () => {
      if (!username) return
      setLoading(true)
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .single()
        if (profileData) setProfile(profileData as User)

        const { data: specimenData } = await supabase
          .from('specimens')
          .select('*, photos:specimen_photos(*)')
          .eq('user_id', profileData?.id ?? '')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(20)
        if (specimenData) setSpecimens(specimenData as Specimen[])
      } catch { /* use demo */ }
      finally { setLoading(false) }
    }
    load()
  }, [username])

  const handleFollow = async () => {
    if (!authUser) return
    setIsFollowing(f => !f)
    setProfile(p => ({ ...p, follower_count: p.follower_count + (isFollowing ? -1 : 1) }))
    try {
      if (isFollowing) {
        await supabase.from('follows').delete().match({ follower_id: authUser.id, following_id: profile.id })
      } else {
        await supabase.from('follows').insert({ follower_id: authUser.id, following_id: profile.id })
      }
    } catch { /* revert */ }
  }

  const initials = (profile.display_name ?? profile.username).split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div>
      {/* Avatar + info */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 20 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 24, flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#f5f5f5' }}>{profile.display_name ?? profile.username}</h1>
          <p style={{ margin: '2px 0 0', color: '#7c3aed', fontSize: 14 }}>@{profile.username}</p>
          {profile.bio && <p style={{ margin: '8px 0 0', color: '#a3a3a3', fontSize: 13, lineHeight: 1.5 }}>{profile.bio}</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
            {profile.location && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#525252', fontSize: 12 }}>
                <MapPin size={12} /> {profile.location}
              </span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#525252', fontSize: 12 }}>
              <Calendar size={12} /> Joined {format(new Date(profile.created_at), 'MMM yyyy')}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
        {[
          { label: 'Specimens', value: profile.specimen_count },
          { label: 'Followers', value: profile.follower_count },
          { label: 'Following', value: profile.following_count },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
            <div style={{ color: '#f5f5f5', fontWeight: 800, fontSize: 20 }}>{value}</div>
            <div style={{ color: '#525252', fontSize: 12, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      {!isOwnProfile && authUser && (
        <button
          onClick={handleFollow}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: isFollowing ? '#111' : '#7c3aed',
            border: `1px solid ${isFollowing ? '#333' : '#7c3aed'}`,
            borderRadius: 10, padding: '12px', color: isFollowing ? '#a3a3a3' : '#fff',
            cursor: 'pointer', fontSize: 15, fontWeight: 600, marginBottom: 20, transition: 'all 0.15s',
          }}
        >
          {isFollowing ? <><UserMinus size={16} /> Unfollow</> : <><UserPlus size={16} /> Follow</>}
        </button>
      )}

      {isOwnProfile && (
        <Link to="/collection" style={{ display: 'block', width: '100%', textAlign: 'center', background: '#111', border: '1px solid #333', borderRadius: 10, padding: '12px', color: '#a3a3a3', textDecoration: 'none', fontSize: 14, fontWeight: 600, marginBottom: 20 }}>
          Manage Collection
        </Link>
      )}

      {/* Specimens */}
      <h3 style={{ margin: '0 0 12px', color: '#f5f5f5', fontSize: 16, fontWeight: 700 }}>Specimens</h3>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#525252' }}>Loading…</div>
      ) : specimens.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#525252' }}>No public specimens yet.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {specimens.map(s => <SpecimenCard key={s.id} specimen={s} compact />)}
        </div>
      )}
    </div>
  )
}
