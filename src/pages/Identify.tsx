import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, MapPin, FileText, Save } from 'lucide-react'
import IdentifyFlow from '../components/IdentifyFlow'
import type { AICandidate } from '../types'
import { getPublicUrl, supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuthContext'

type SaveStep = 'identify' | 'details' | 'saved'

export default function Identify() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [saveStep, setSaveStep] = useState<SaveStep>('identify')
  const [identifiedCandidate, setIdentifiedCandidate] = useState<AICandidate | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [form, setForm] = useState({
    mineral_name: '',
    variety: '',
    locality: '',
    locality_country: '',
    description: '',
    is_public: true,
  })

  const handleIdentified = (candidate: AICandidate, file: File) => {
    setIdentifiedCandidate(candidate)
    setImageFile(file)
    setSaveError(null)
    setForm({
      mineral_name: candidate.mineral_name,
      variety: '',
      locality: '',
      locality_country: '',
      description: '',
      is_public: true,
    })
    setSaveStep('details')
  }

  const handleSave = async () => {
    if (!user || !identifiedCandidate) return
    const mineralName = form.mineral_name.trim() || identifiedCandidate.mineral_name
    if (!mineralName.trim()) {
      setSaveError('Add a mineral name before saving your specimen.')
      return
    }

    setSaving(true)
    setSaveError(null)
    try {
      let photoPath = ''
      if (imageFile) {
        const ext = imageFile.name.split('.').pop() ?? 'jpg'
        const path = `${user.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('specimen-photos')
          .upload(path, imageFile)
        if (uploadError) throw uploadError
        photoPath = path
      }

      const { data: specimen, error } = await supabase
        .from('specimens')
        .insert({
          user_id: user.id,
          mineral_name: mineralName,
          mineral_group: identifiedCandidate.mineral_group,
          variety: form.variety.trim() || null,
          locality: form.locality.trim() || null,
          locality_country: form.locality_country.trim() || null,
          description: form.description.trim() || identifiedCandidate.description,
          is_public: form.is_public,
          ai_identified: true,
          quality_grade: 'community',
          location_precision: 10,
        })
        .select()
        .single()

      if (error) throw error

      if (photoPath && specimen) {
        const { error: photoError } = await supabase.from('specimen_photos').insert({
          specimen_id: specimen.id,
          storage_path: photoPath,
          url: getPublicUrl(photoPath),
          is_primary: true,
        })
        if (photoError) throw photoError
      }

      setSaveStep('saved')
      setTimeout(() => navigate('/collection'), 1500)
    } catch (err) {
      console.error('Save failed:', err)
      setSaveError(err instanceof Error ? err.message : 'We could not save your specimen. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#f5f5f5', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={20} style={{ color: '#7c3aed' }} /> AI Identify
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#525252' }}>
          {saveStep === 'identify' ? 'Upload a photo to identify your mineral specimen' :
           saveStep === 'details' ? 'Add details to save your specimen' : 'Saving…'}
        </p>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 24 }}>
        {[['Identify', 'identify'], ['Details', 'details'], ['Saved', 'saved']].map(([label, s], i, arr) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: s !== 'saved' ? 'none' : 1 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: saveStep === s ? '#7c3aed' : (['identify','details','saved'].indexOf(saveStep) > i) ? '#4c1d95' : '#1a1a1a',
              color: saveStep === s ? '#fff' : '#525252',
              fontSize: 12, fontWeight: 700, transition: 'all 0.3s', flexShrink: 0,
            }}>
              {i + 1}
            </div>
            <span style={{ marginLeft: 6, fontSize: 12, color: saveStep === s ? '#f5f5f5' : '#525252', whiteSpace: 'nowrap' }}>{label}</span>
            {i < arr.length - 1 && <div style={{ flex: 1, height: 1, background: '#1a1a1a', margin: '0 8px', minWidth: 16 }} />}
          </div>
        ))}
      </div>

      {saveStep === 'identify' && <IdentifyFlow onIdentified={handleIdentified} />}

      {saveStep === 'details' && identifiedCandidate && (
        <div>
          {/* Summary */}
          <div style={{ background: '#0a0a0a', border: '1px solid #1a1a2e', borderRadius: 12, padding: 16, marginBottom: 20, display: 'flex', gap: 12 }}>
            <Sparkles size={24} style={{ color: '#7c3aed', flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ color: '#f5f5f5', fontWeight: 700, fontSize: 16 }}>{identifiedCandidate.mineral_name}</div>
              <div style={{ color: '#7c3aed', fontSize: 13 }}>{identifiedCandidate.mineral_group} · {Math.round(identifiedCandidate.confidence * 100)}% confidence</div>
            </div>
          </div>

          {/* Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Mineral Name *', key: 'mineral_name', placeholder: identifiedCandidate.mineral_name },
              { label: 'Variety', key: 'variety', placeholder: 'e.g. Chevron, Phantom…' },
              { label: 'Locality', key: 'locality', placeholder: 'Mine or region name' },
              { label: 'Country', key: 'locality_country', placeholder: 'Country of origin' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: 13, color: '#a3a3a3', marginBottom: 6 }}>
                  <FileText size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />{label}
                </label>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={form[key as keyof typeof form] as string}
                  onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  style={{ width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, padding: '10px 12px', color: '#f5f5f5', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            ))}

            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#a3a3a3', marginBottom: 6 }}>
                <FileText size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />Description
              </label>
              <textarea
                placeholder="Additional notes about this specimen…"
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                style={{ width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, padding: '10px 12px', color: '#f5f5f5', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 8, padding: '12px 14px' }}>
              <div>
                <div style={{ color: '#f5f5f5', fontSize: 14, fontWeight: 500 }}>Make Public</div>
                <div style={{ color: '#525252', fontSize: 12 }}>Share with community</div>
              </div>
              <button
                onClick={() => setForm(prev => ({ ...prev, is_public: !prev.is_public }))}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: form.is_public ? '#7c3aed' : '#333',
                  transition: 'background 0.2s',
                  position: 'relative',
                }}
              >
                <div style={{
                  position: 'absolute', top: 2, left: form.is_public ? 22 : 2,
                  width: 20, height: 20, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 8 }}>
              <MapPin size={16} style={{ color: '#525252' }} />
              <span style={{ fontSize: 13, color: '#525252' }}>Location obfuscated to ~10km radius for privacy</span>
            </div>

            {saveError && (
              <div style={{ padding: '10px 12px', background: '#1a0a0a', border: '1px solid #4a1a1a', borderRadius: 8, color: '#ef4444', fontSize: 13 }}>
                {saveError}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                width: '100%', background: saving ? '#333' : 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                border: 'none', borderRadius: 10, padding: '14px', color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer', fontSize: 15, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s',
              }}
            >
              <Save size={16} /> {saving ? 'Saving…' : 'Save to Collection'}
            </button>
          </div>
        </div>
      )}

      {saveStep === 'saved' && (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✨</div>
          <div style={{ color: '#10b981', fontWeight: 700, fontSize: 20 }}>Saved!</div>
          <div style={{ color: '#525252', fontSize: 14, marginTop: 6 }}>Redirecting to your collection…</div>
        </div>
      )}
    </div>
  )
}
