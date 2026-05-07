import { Link } from 'react-router-dom'
import { Heart, MessageCircle, MapPin, Lock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Specimen } from '../types'

interface Props {
  specimen: Specimen
  compact?: boolean
}

const gradeColors: Record<string, string> = {
  research: '#10b981',
  community: '#06b6d4',
  needs_id: '#f59e0b',
}

const gradeLabels: Record<string, string> = {
  research: 'Research Grade',
  community: 'Community ID',
  needs_id: 'Needs ID',
}

export default function SpecimenCard({ specimen, compact = false }: Props) {
  const primaryPhoto = specimen.photos?.find(p => p.is_primary) ?? specimen.photos?.[0]
  const gradeColor = gradeColors[specimen.quality_grade] ?? '#525252'

  return (
    <Link
      to={`/specimen/${specimen.id}`}
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <article style={{
        background: '#0a0a0a',
        border: '1px solid #1a1a1a',
        borderRadius: 12,
        overflow: 'hidden',
        transition: 'border-color 0.15s',
        cursor: 'pointer',
      }}>
        {/* Photo */}
        <div style={{ position: 'relative', aspectRatio: compact ? '4/3' : '16/10', background: '#111', overflow: 'hidden' }}>
          {primaryPhoto ? (
            <img
              src={primaryPhoto.url}
              alt={specimen.mineral_name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              loading="lazy"
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontSize: 48 }}>
              💎
            </div>
          )}
          {/* Grade badge */}
          <span style={{
            position: 'absolute', top: 8, left: 8,
            background: 'rgba(0,0,0,0.75)',
            border: `1px solid ${gradeColor}`,
            borderRadius: 6,
            padding: '2px 8px',
            fontSize: 11,
            color: gradeColor,
            fontWeight: 600,
            backdropFilter: 'blur(4px)',
          }}>
            {gradeLabels[specimen.quality_grade]}
          </span>
          {!specimen.is_public && (
            <span style={{
              position: 'absolute', top: 8, right: 8,
              background: 'rgba(0,0,0,0.75)',
              borderRadius: 6,
              padding: '4px',
              color: '#a3a3a3',
              display: 'flex',
              backdropFilter: 'blur(4px)',
            }}>
              <Lock size={14} />
            </span>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: compact ? '10px 12px' : '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: compact ? 15 : 17, fontWeight: 700, color: '#f5f5f5', lineHeight: 1.2 }}>
                {specimen.mineral_name}
              </h3>
              {specimen.variety && (
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#7c3aed' }}>var. {specimen.variety}</p>
              )}
            </div>
            {specimen.ai_identified && (
              <span style={{ fontSize: 10, background: '#1a1a2e', border: '1px solid #4c1d95', borderRadius: 4, padding: '2px 6px', color: '#a78bfa', whiteSpace: 'nowrap' }}>
                AI ID
              </span>
            )}
          </div>

          {specimen.locality && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#525252', fontSize: 13, marginBottom: 8 }}>
              <MapPin size={12} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {specimen.locality}{specimen.locality_country ? `, ${specimen.locality_country}` : ''}
              </span>
            </div>
          )}

          {!compact && specimen.description && (
            <p style={{ margin: '0 0 10px', fontSize: 13, color: '#a3a3a3', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {specimen.description}
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#525252', fontSize: 13 }}>
                <Heart size={14} /> {specimen.like_count ?? 0}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#525252', fontSize: 13 }}>
                <MessageCircle size={14} /> {specimen.comment_count ?? 0}
              </span>
            </div>
            {specimen.user && (
              <span style={{ fontSize: 12, color: '#525252' }}>
                @{specimen.user.username} · {formatDistanceToNow(new Date(specimen.created_at), { addSuffix: true })}
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}
