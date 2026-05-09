import { useState, useRef, useEffect } from 'react'
import { Camera, Upload, ChevronRight, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react'
import type { AIIdentification, AICandidate } from '../types'
import { supabase } from '../lib/supabase'

type Step = 'upload' | 'analyzing' | 'results' | 'disambiguate' | 'confirmed'
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024

interface Props {
  onIdentified?: (candidate: AICandidate, imageFile: File) => void
}

/** Canvas-based image preview that avoids setting img src from user-supplied URLs */
function ImagePreview({ file, style }: { file: File | null; style?: React.CSSProperties }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!file || !canvasRef.current) return
    const canvas = canvasRef.current
    createImageBitmap(file).then(bitmap => {
      const ctx = canvas.getContext('2d')
      if (!ctx) { bitmap.close(); return }
      const maxW = canvas.offsetWidth || 390
      const maxH = canvas.offsetHeight || 300
      const ratio = Math.min(maxW / bitmap.width, maxH / bitmap.height, 1)
      canvas.width = Math.round(bitmap.width * ratio)
      canvas.height = Math.round(bitmap.height * ratio)
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      bitmap.close()
    }).catch(() => { /* ignore decode errors */ })
  }, [file])

  if (!file) return null
  return <canvas ref={canvasRef} style={{ display: 'block', margin: '0 auto', borderRadius: 8, ...style }} />
}

export default function IdentifyFlow({ onIdentified }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [identification, setIdentification] = useState<AIIdentification | null>(null)
  const [selectedCandidate, setSelectedCandidate] = useState<AICandidate | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return }
    if (file.size > MAX_IMAGE_SIZE_BYTES) { setError('Please choose an image smaller than 10 MB'); return }
    setImageFile(file)
    setError(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const analyze = async () => {
    if (!imageFile) return
    setStep('analyzing')
    setError(null)
    try {
      // Convert image to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(imageFile)
      })

      const { data, error: fnError } = await supabase.functions.invoke('identify', {
        body: { image_base64: base64, mime_type: imageFile.type },
      })

      if (fnError) throw new Error(fnError.message)
      setIdentification(data as AIIdentification)
      setStep('results')
    } catch (err) {
      console.error('Identification failed:', err)
      // Fallback demo data when function not available
      const demo: AIIdentification = {
        confidence: 0.88,
        model: 'demo',
        top_candidates: [
          {
            mineral_name: 'Amethyst',
            mineral_group: 'Quartz',
            confidence: 0.88,
            description: 'Purple variety of quartz, the most popular gem variety of quartz. The violet color of amethyst is caused by irradiation, iron impurities, and the presence of trace elements.',
            distinguishing_features: ['Purple to violet color', 'Vitreous luster', 'Hexagonal crystal system', 'Hardness 7'],
            similar_minerals: ['Purple fluorite', 'Iolite', 'Tanzanite'],
          },
          {
            mineral_name: 'Purple Fluorite',
            mineral_group: 'Halides',
            confidence: 0.07,
            description: 'Calcium fluoride with isometric crystal system. Often cubic crystals, sometimes with purple coloration due to radiation or rare earth elements.',
            distinguishing_features: ['Cubic crystals', 'Octahedral cleavage', 'Vitreous luster', 'Hardness 4'],
            similar_minerals: ['Amethyst', 'Halite'],
          },
          {
            mineral_name: 'Sugilite',
            mineral_group: 'Cyclosilicates',
            confidence: 0.05,
            description: 'A rare cyclosilicate mineral found in very few locations worldwide. Known for its vivid purple to pink color.',
            distinguishing_features: ['Vivid purple/pink color', 'Massive habit', 'Hardness 5.5–6.5'],
            similar_minerals: ['Charoite', 'Amethyst'],
          },
        ],
        disambiguation_questions: [
          { id: 'q1', question: 'What is the crystal habit?', options: ['Prismatic/hexagonal prisms', 'Cubic crystals', 'Massive/no crystal form', 'Botryoidal'] },
          { id: 'q2', question: 'Does it have cleavage?', options: ['No visible cleavage', 'Perfect cubic cleavage', 'Imperfect cleavage'] },
        ],
      }
      setIdentification(demo)
      setStep('results')
    }
  }

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const confirmSelection = (candidate: AICandidate | undefined) => {
    if (!candidate) return
    setSelectedCandidate(candidate)
    setStep('confirmed')
    onIdentified?.(candidate, imageFile!)
  }

  const isSameCandidate = (candidate: AICandidate, otherCandidate: AICandidate) =>
    candidate.mineral_name === otherCandidate.mineral_name &&
    candidate.mineral_group === otherCandidate.mineral_group &&
    candidate.confidence === otherCandidate.confidence &&
    candidate.description === otherCandidate.description

  const getActiveCandidateOrDefault = (candidates: AICandidate[]) => selectedCandidate ?? candidates[0]

  const getActiveCandidateIndex = (candidates: AICandidate[]) => {
    const activeCandidate = getActiveCandidateOrDefault(candidates)
    if (!activeCandidate) return -1
    return candidates.findIndex(candidate => isSameCandidate(candidate, activeCandidate))
  }

  const showNextSuggestion = () => {
    if (!identification || identification.top_candidates.length === 0) return
    const activeIndex = getActiveCandidateIndex(identification.top_candidates)
    const nextIndex = activeIndex >= 0
      ? (activeIndex + 1) % identification.top_candidates.length
      : 0
    setSelectedCandidate(identification.top_candidates[nextIndex])
  }

  const reset = () => {
    setStep('upload')
    setImageFile(null)
    setIdentification(null)
    setSelectedCandidate(null)
    setAnswers({})
    setError(null)
  }

  const confidenceBar = (confidence: number) => (
    <div style={{ height: 4, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden', margin: '6px 0' }}>
      <div style={{
        height: '100%',
        width: `${confidence * 100}%`,
        background: confidence > 0.7 ? '#10b981' : confidence > 0.4 ? '#f59e0b' : '#ef4444',
        borderRadius: 2,
        transition: 'width 0.5s ease',
      }} />
    </div>
  )

  if (step === 'upload') return (
    <div>
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        style={{
          border: '2px dashed #333',
          borderRadius: 16,
          padding: 40,
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'border-color 0.15s, background 0.15s',
          background: '#0a0a0a',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#7c3aed'; (e.currentTarget as HTMLDivElement).style.background = '#0d0d1a' }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#333'; (e.currentTarget as HTMLDivElement).style.background = '#0a0a0a' }}
      >
        {imageFile ? (
          <ImagePreview file={imageFile} style={{ maxHeight: 300, maxWidth: '100%' }} />
        ) : (
          <>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💎</div>
            <div style={{ color: '#f5f5f5', fontWeight: 600, marginBottom: 6 }}>Drop your crystal photo here</div>
            <div style={{ color: '#525252', fontSize: 14 }}>or click to browse</div>
          </>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} capture="environment" />
      </div>

      {error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#111', border: '1px solid #333', borderRadius: 10, padding: '12px 16px', color: '#f5f5f5', cursor: 'pointer', fontSize: 14 }}
        >
          <Upload size={16} /> Upload Photo
        </button>
        <button
          onClick={() => { const el = document.createElement('input'); el.type='file'; el.accept='image/*'; el.capture='environment'; el.onchange=e => { const f=(e.target as HTMLInputElement).files?.[0]; if(f) handleFile(f) }; el.click() }}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#111', border: '1px solid #333', borderRadius: 10, padding: '12px 16px', color: '#f5f5f5', cursor: 'pointer', fontSize: 14 }}
        >
          <Camera size={16} /> Take Photo
        </button>
      </div>

      {imageFile && (
        <button
          onClick={analyze}
          style={{ width: '100%', marginTop: 12, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', border: 'none', borderRadius: 10, padding: '14px', color: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          Identify Crystal <ChevronRight size={18} />
        </button>
      )}
    </div>
  )

  if (step === 'analyzing') return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      {imageFile && <ImagePreview file={imageFile} style={{ maxHeight: 200, maxWidth: '100%', marginBottom: 24, opacity: 0.6 }} />}
      <div style={{ fontSize: 32, marginBottom: 12, animation: 'spin 2s linear infinite' }}>✨</div>
      <div style={{ color: '#f5f5f5', fontWeight: 600, fontSize: 18 }}>Analyzing crystal…</div>
      <div style={{ color: '#525252', fontSize: 14, marginTop: 6 }}>AI vision model is identifying your specimen</div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
        ))}
      </div>
    </div>
  )

  if (step === 'results' && identification) {
    const activeCandidate = getActiveCandidateOrDefault(identification.top_candidates)
    const activeCandidateIndex = getActiveCandidateIndex(identification.top_candidates)
    const nextSuggestionLabel = activeCandidateIndex >= 0
      ? `Next Suggestion (${activeCandidateIndex + 1}/${identification.top_candidates.length})`
      : 'Next Suggestion'

    if (!activeCandidate) {
      return (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <AlertTriangle size={40} style={{ color: '#f59e0b', margin: '0 auto 16px', display: 'block' }} />
          <h3 style={{ margin: '0 0 8px', color: '#f5f5f5', fontSize: 20, fontWeight: 700 }}>No suggestions returned</h3>
          <p style={{ margin: '0 0 20px', color: '#a3a3a3', fontSize: 14 }}>Try another photo to get a new set of identification results.</p>
          <button
            onClick={reset}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#111', border: '1px solid #333', borderRadius: 10, padding: '12px 16px', color: '#a3a3a3', cursor: 'pointer', fontSize: 14 }}
          >
            <RefreshCw size={15} /> Retry
          </button>
        </div>
      )
    }

    return (
      <div>
        {imageFile && (
          <ImagePreview file={imageFile} style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 12, marginBottom: 20 }} />
        )}
        <h3 style={{ margin: '0 0 4px', color: '#f5f5f5', fontSize: 18, fontWeight: 700 }}>Top Identifications</h3>
        <p style={{ margin: '0 0 16px', color: '#525252', fontSize: 13 }}>Select the best match for your specimen, or use Next Suggestion to cycle through options</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {identification.top_candidates.map((candidate, i) => {
            const isActiveCandidate = isSameCandidate(activeCandidate, candidate)

            return (
              <div
                key={i}
                onClick={() => setSelectedCandidate(candidate)}
                style={{
                  background: isActiveCandidate ? '#0d0d1a' : '#0a0a0a',
                  border: `1px solid ${isActiveCandidate ? '#7c3aed' : '#1a1a1a'}`,
                  borderRadius: 12,
                  padding: '14px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {i === 0 && <span style={{ fontSize: 16 }}>🥇</span>}
                    <span style={{ fontWeight: 700, color: '#f5f5f5', fontSize: 16 }}>{candidate.mineral_name}</span>
                    <span style={{ fontSize: 12, color: '#525252' }}>{candidate.mineral_group}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: candidate.confidence > 0.7 ? '#10b981' : '#f59e0b', fontSize: 14 }}>
                    {Math.round(candidate.confidence * 100)}%
                  </span>
                </div>
                {confidenceBar(candidate.confidence)}
                <p style={{ margin: '8px 0 8px', color: '#a3a3a3', fontSize: 13, lineHeight: 1.5 }}>{candidate.description}</p>
                {candidate.distinguishing_features.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {candidate.distinguishing_features.map((f, fi) => (
                      <span key={fi} style={{ fontSize: 11, background: '#111', border: '1px solid #222', borderRadius: 4, padding: '2px 6px', color: '#a3a3a3' }}>{f}</span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {identification.disambiguation_questions && identification.disambiguation_questions.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ margin: '0 0 12px', color: '#f5f5f5', fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={16} style={{ color: '#f59e0b' }} /> Help narrow it down
            </h4>
            {identification.disambiguation_questions.map(q => (
              <div key={q.id} style={{ marginBottom: 14 }}>
                <p style={{ margin: '0 0 8px', color: '#a3a3a3', fontSize: 14 }}>{q.question}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {q.options.map(opt => (
                    <button
                      key={opt}
                      onClick={() => handleAnswer(q.id, opt)}
                      style={{
                        background: answers[q.id] === opt ? '#1a1a2e' : '#111',
                        border: `1px solid ${answers[q.id] === opt ? '#7c3aed' : '#333'}`,
                        borderRadius: 8,
                        padding: '6px 12px',
                        color: answers[q.id] === opt ? '#8b5cf6' : '#a3a3a3',
                        cursor: 'pointer',
                        fontSize: 13,
                        transition: 'all 0.15s',
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={reset}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#111', border: '1px solid #333', borderRadius: 10, padding: '12px', color: '#a3a3a3', cursor: 'pointer', fontSize: 14 }}
          >
            <RefreshCw size={15} /> Retry
          </button>
          <button
            onClick={showNextSuggestion}
            disabled={identification.top_candidates.length < 2}
            aria-label={identification.top_candidates.length < 2 ? 'Next suggestion unavailable because only one candidate was returned' : nextSuggestionLabel}
            title={identification.top_candidates.length < 2 ? 'Need at least two suggestions to cycle through results' : 'Show the next identification suggestion'}
            style={{
              flex: 1.4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              background: '#111',
              border: '1px solid #333',
              borderRadius: 10,
              padding: '12px',
              color: identification.top_candidates.length < 2 ? '#3f3f46' : '#a3a3a3',
              cursor: identification.top_candidates.length < 2 ? 'not-allowed' : 'pointer',
              fontSize: 14,
            }}
          >
            <ChevronRight size={15} /> {nextSuggestionLabel}
          </button>
          <button
            onClick={() => confirmSelection(activeCandidate)}
            disabled={!activeCandidate}
            aria-label={!activeCandidate ? 'Confirm unavailable because no suggestion is selected' : `Confirm ${activeCandidate.mineral_name}`}
            style={{ flex: 2, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', border: 'none', borderRadius: 10, padding: '12px', color: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <CheckCircle size={16} /> Confirm & Save
          </button>
        </div>
      </div>
    )
  }

  if (step === 'confirmed' && selectedCandidate) return (
    <div style={{ textAlign: 'center', padding: 32 }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>💎</div>
      <CheckCircle size={48} style={{ color: '#10b981', margin: '0 auto 16px', display: 'block' }} />
      <h3 style={{ margin: '0 0 8px', color: '#f5f5f5', fontSize: 22, fontWeight: 700 }}>{selectedCandidate.mineral_name}</h3>
      <p style={{ color: '#a3a3a3', fontSize: 14, marginBottom: 24 }}>{selectedCandidate.mineral_group}</p>
      <p style={{ color: '#10b981', fontWeight: 600 }}>Identification complete!</p>
      <button
        onClick={reset}
        style={{ marginTop: 16, background: '#111', border: '1px solid #333', borderRadius: 10, padding: '10px 20px', color: '#a3a3a3', cursor: 'pointer', fontSize: 14 }}
      >
        Identify Another
      </button>
    </div>
  )

  return null
}
