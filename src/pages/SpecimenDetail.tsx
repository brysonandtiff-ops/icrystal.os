import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Heart, MessageCircle, MapPin, Share2, ArrowLeft, Sparkles } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Specimen, Comment } from '../types'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuthContext'

const DEMO_SPECIMEN: Specimen = {
  id: '1', user_id: 'u1',
  user: { id: 'u1', username: 'crystalhunter', display_name: 'Crystal Hunter', avatar_url: null },
  mineral_name: 'Amethyst', mineral_group: 'Quartz', variety: 'Chevron',
  locality: 'Thunder Bay', locality_country: 'Canada',
  lat: 48.4, lng: -89.3, obfuscated_lat: 48.3, obfuscated_lng: -89.2,
  location_precision: 10,
  description: 'Beautiful purple amethyst with characteristic chevron banding found in Thunder Bay, Ontario. The specimen shows alternating bands of white quartz and purple amethyst. Collector piece.',
  crystal_system: 'Trigonal', luster: 'Vitreous', color: 'Purple', hardness: 7,
  photos: [], is_public: true, quality_grade: 'research', ai_identified: true,
  like_count: 24, comment_count: 5,
  created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  updated_at: new Date().toISOString(),
}

const DEMO_COMMENTS: Comment[] = [
  { id: 'c1', specimen_id: '1', user_id: 'u2', user: { id: 'u2', username: 'gemologist_jane', display_name: 'Jane Doe', avatar_url: null }, body: 'Gorgeous chevron banding! The alternating layers are so crisp.', created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: 'c2', specimen_id: '1', user_id: 'u3', user: { id: 'u3', username: 'rockhound99', display_name: 'Rock Hound', avatar_url: null }, body: 'Thunder Bay produces some of the finest chevron amethyst. Nice find!', created_at: new Date(Date.now() - 3600000).toISOString() },
]

const mineralProperties = [
  { label: 'Group', key: 'mineral_group' },
  { label: 'Crystal System', key: 'crystal_system' },
  { label: 'Luster', key: 'luster' },
  { label: 'Color', key: 'color' },
  { label: 'Hardness', key: 'hardness' },
]

const gradeColors: Record<string, string> = { research: '#10b981', community: '#06b6d4', needs_id: '#f59e0b' }
const gradeLabels: Record<string, string> = { research: 'Research Grade', community: 'Community ID', needs_id: 'Needs ID' }

export default function SpecimenDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [specimen, setSpecimen] = useState<Specimen>(DEMO_SPECIMEN)
  const [comments, setComments] = useState<Comment[]>(DEMO_COMMENTS)
  const [liked, setLiked] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      try {
        const { data } = await supabase
          .from('specimens')
          .select('*, user:profiles(id,username,display_name,avatar_url), photos:specimen_photos(*)')
          .eq('id', id)
          .single()
        if (data) setSpecimen(data as Specimen)

        const { data: cmts } = await supabase
          .from('comments')
          .select('*, user:profiles(id,username,display_name,avatar_url)')
          .eq('specimen_id', id)
          .order('created_at', { ascending: true })
        if (cmts) setComments(cmts as Comment[])

        if (user) {
          const { data: likeData } = await supabase
            .from('likes')
            .select('specimen_id')
            .match({ specimen_id: id, user_id: user.id })
            .maybeSingle()
          setLiked(Boolean(likeData))
        } else {
          setLiked(false)
        }
      } catch { /* use demo */ }
    }
    load()
  }, [id, user])

  const handleLike = async () => {
    if (!user) return
    const nextLiked = !liked
    setLiked(nextLiked)
    setSpecimen(s => ({ ...s, like_count: Math.max(0, s.like_count + (nextLiked ? 1 : -1)) }))

    try {
      if (nextLiked) {
        const { error } = await supabase.from('likes').insert({ specimen_id: specimen.id, user_id: user.id })
        if (error) throw error
      } else {
        const { error } = await supabase.from('likes').delete().match({ specimen_id: specimen.id, user_id: user.id })
        if (error) throw error
      }
    } catch (err) {
      console.error('Like failed:', err)
      setLiked(!nextLiked)
      setSpecimen(s => ({ ...s, like_count: Math.max(0, s.like_count + (nextLiked ? -1 : 1)) }))
    }
  }

  const handleComment = async () => {
    if (!commentText.trim() || !user) return
    setSubmitting(true)
    setCommentError(null)
    const newComment: Comment = {
      id: `temp-${Date.now()}`,
      specimen_id: specimen.id,
      user_id: user.id,
      user: { id: user.id, username: user.email?.split('@')[0] ?? 'you', display_name: null, avatar_url: null },
      body: commentText,
      created_at: new Date().toISOString(),
    }
    try {
      const { data } = await supabase.from('comments').insert({ specimen_id: specimen.id, user_id: user.id, body: commentText }).select('*, user:profiles(id,username,display_name,avatar_url)').single()
      setComments(c => [...c, (data as Comment) ?? newComment])
      setCommentError(null)
      setCommentText('')
    } catch (err) {
      console.error('Comment failed:', err)
      setCommentError(err instanceof Error ? err.message : 'Unable to post comment right now.')
    }
    setSubmitting(false)
  }

  const primaryPhoto = specimen.photos?.find(p => p.is_primary) ?? specimen.photos?.[0]

  return (
    <div>
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#525252', textDecoration: 'none', fontSize: 14, marginBottom: 16 }}>
        <ArrowLeft size={16} /> Back
      </Link>

      {/* Photo */}
      <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 16, background: '#111', aspectRatio: '4/3' }}>
        {primaryPhoto ? (
          <img src={primaryPhoto.url} alt={specimen.mineral_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80 }}>💎</div>
        )}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#f5f5f5' }}>{specimen.mineral_name}</h1>
          {specimen.variety && <p style={{ margin: '2px 0 0', color: '#7c3aed', fontSize: 14 }}>var. {specimen.variety}</p>}
        </div>
        <span style={{ fontSize: 12, border: `1px solid ${gradeColors[specimen.quality_grade]}`, borderRadius: 6, padding: '3px 8px', color: gradeColors[specimen.quality_grade] }}>
          {gradeLabels[specimen.quality_grade]}
        </span>
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        {specimen.locality && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#a3a3a3', fontSize: 13 }}>
            <MapPin size={13} /> {specimen.locality}{specimen.locality_country ? `, ${specimen.locality_country}` : ''}
          </span>
        )}
        {specimen.ai_identified && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#7c3aed' }}>
            <Sparkles size={13} /> AI Identified
          </span>
        )}
      </div>

      {/* Description */}
      {specimen.description && (
        <p style={{ color: '#a3a3a3', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>{specimen.description}</p>
      )}

      {/* Properties */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 20 }}>
        {mineralProperties.map(({ label, key }) => {
          const val = specimen[key as keyof Specimen]
          if (!val) return null
          return (
            <div key={key} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ color: '#525252', fontSize: 11, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
              <div style={{ color: '#f5f5f5', fontSize: 14, fontWeight: 600 }}>{String(val)}</div>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #1a1a1a' }}>
        <button
          onClick={handleLike}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: liked ? '#1a0a2e' : '#0a0a0a',
            border: `1px solid ${liked ? '#7c3aed' : '#1a1a1a'}`,
            borderRadius: 10, padding: '10px 16px',
            color: liked ? '#8b5cf6' : '#a3a3a3', cursor: 'pointer', fontSize: 14,
            transition: 'all 0.15s',
          }}
        >
          <Heart size={16} fill={liked ? '#8b5cf6' : 'none'} /> {specimen.like_count}
        </button>
        <button
          onClick={() => document.getElementById('comment-input')?.focus()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 10, padding: '10px 16px', color: '#a3a3a3', cursor: 'pointer', fontSize: 14 }}
        >
          <MessageCircle size={16} /> {comments.length}
        </button>
        <button
          onClick={() => navigator.share?.({ url: window.location.href, title: specimen.mineral_name }) ?? navigator.clipboard?.writeText(window.location.href)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 10, padding: '10px 16px', color: '#a3a3a3', cursor: 'pointer', fontSize: 14, marginLeft: 'auto' }}
        >
          <Share2 size={16} />
        </button>
      </div>

      {/* Posted by */}
      {specimen.user && (
        <Link to={`/profile/${specimen.user.username}`} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, textDecoration: 'none' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>
            {(specimen.user.display_name ?? specimen.user.username).charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ color: '#f5f5f5', fontWeight: 600, fontSize: 14 }}>{specimen.user.display_name ?? specimen.user.username}</div>
            <div style={{ color: '#525252', fontSize: 12 }}>@{specimen.user.username} · {formatDistanceToNow(new Date(specimen.created_at), { addSuffix: true })}</div>
          </div>
        </Link>
      )}

      {/* Comments */}
      <div>
        <h3 style={{ margin: '0 0 16px', color: '#f5f5f5', fontSize: 16, fontWeight: 700 }}>Comments ({comments.length})</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          {comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a3a3a3', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                {(c.user?.display_name ?? c.user?.username ?? '?').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ color: '#f5f5f5', fontWeight: 600, fontSize: 13 }}>{c.user?.display_name ?? c.user?.username}</span>
                  <span style={{ color: '#525252', fontSize: 11 }}>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                </div>
                <p style={{ margin: 0, color: '#a3a3a3', fontSize: 14, lineHeight: 1.5 }}>{c.body}</p>
              </div>
            </div>
          ))}
        </div>

        {user ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="comment-input"
                type="text"
                placeholder="Add a comment…"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleComment()}
                style={{ flex: 1, background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, padding: '10px 12px', color: '#f5f5f5', fontSize: 14, outline: 'none' }}
              />
              <button
                onClick={handleComment}
                disabled={submitting || !commentText.trim()}
                style={{ background: '#7c3aed', border: 'none', borderRadius: 8, padding: '10px 16px', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14, opacity: submitting || !commentText.trim() ? 0.5 : 1 }}
              >
                Post
              </button>
            </div>
            {commentError && <div style={{ color: '#ef4444', fontSize: 13 }}>{commentError}</div>}
          </div>
        ) : (
          <Link to="/login" style={{ display: 'block', textAlign: 'center', padding: '12px', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 10, color: '#7c3aed', textDecoration: 'none', fontSize: 14 }}>
            Sign in to comment
          </Link>
        )}
      </div>
    </div>
  )
}
