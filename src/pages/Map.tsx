import { useEffect, useRef, useState } from 'react'
import { Compass, Layers } from 'lucide-react'
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
import { supabase } from '../lib/supabase'

const DEMO_POINTS = [
  { id: '1', lat: 48.4, lng: -89.3, mineral_name: 'Amethyst', locality: 'Thunder Bay, Canada' },
  { id: '2', lat: -10.7, lng: 25.5, mineral_name: 'Malachite', locality: 'Kolwezi, DR Congo' },
  { id: '3', lat: 37.5, lng: -88.2, mineral_name: 'Fluorite', locality: 'Cave-in-Rock, USA' },
  { id: '4', lat: -19.9, lng: -44.0, mineral_name: 'Tourmaline', locality: 'Minas Gerais, Brazil' },
  { id: '5', lat: 51.5, lng: -0.1, mineral_name: 'Flint', locality: 'London, UK' },
  { id: '6', lat: 35.7, lng: 139.7, mineral_name: 'Jade', locality: 'Tokyo, Japan' },
  { id: '7', lat: -33.9, lng: 18.4, mineral_name: 'Tiger\'s Eye', locality: 'Cape Town, South Africa' },
]

const toFeatureCollection = (points: typeof DEMO_POINTS) => ({
  type: 'FeatureCollection' as const,
  features: points.map((point) => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [point.lng, point.lat] },
    properties: { id: point.id, mineral_name: point.mineral_name, locality: point.locality },
  })),
})

export default function MapPage() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<typeof DEMO_POINTS[0] | null>(null)
  const [points, setPoints] = useState(DEMO_POINTS)

  useEffect(() => {
    let cancelled = false

    const initMap = async () => {
      if (!mapContainer.current) return
      try {
        const maplibregl = await import('maplibre-gl')
        await import('maplibre-gl/dist/maplibre-gl.css')

        if (cancelled) return

        const map = new maplibregl.Map({
          container: mapContainer.current!,
          style: {
            version: 8,
            sources: {
              'osm-tiles': {
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256,
                attribution: '© OpenStreetMap contributors',
              },
            },
            layers: [{
              id: 'osm-tiles',
              type: 'raster',
              source: 'osm-tiles',
              paint: { 'raster-opacity': 0.7 },
            }],
          },
          center: [0, 20],
          zoom: 1.5,
        })

        mapRef.current = map

        map.on('load', () => {
          if (cancelled) return

          // Add source
          map.addSource('specimens', {
            type: 'geojson',
            data: toFeatureCollection(DEMO_POINTS),
          })

          // Cluster layer
          map.addLayer({
            id: 'specimens-circles',
            type: 'circle',
            source: 'specimens',
            paint: {
              'circle-radius': 10,
              'circle-color': '#7c3aed',
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 2,
              'circle-opacity': 0.9,
            },
          })

          map.on('click', 'specimens-circles', (e) => {
            const props = e.features?.[0]?.properties
            if (props) setSelectedPoint({ id: props.id, lat: e.lngLat.lat, lng: e.lngLat.lng, mineral_name: props.mineral_name, locality: props.locality })
          })

          map.on('mouseenter', 'specimens-circles', () => { map.getCanvas().style.cursor = 'pointer' })
          map.on('mouseleave', 'specimens-circles', () => { map.getCanvas().style.cursor = '' })
        })

        // Fetch real data
        try {
          const { data } = await supabase
            .from('specimens')
            .select('id, mineral_name, locality, obfuscated_lat, obfuscated_lng')
            .eq('is_public', true)
            .not('obfuscated_lat', 'is', null)
            .not('obfuscated_lng', 'is', null)
            .limit(200)
          if (data && data.length > 0) {
            setPoints(data.map(s => ({ id: s.id, lat: s.obfuscated_lat, lng: s.obfuscated_lng, mineral_name: s.mineral_name, locality: s.locality ?? '' })))
          }
        } catch { /* use demo */ }

      } catch (err) {
        if (!cancelled) setMapError('Map failed to load. Please refresh.')
        console.error(err)
      }
    }

    initMap()

    return () => {
      cancelled = true
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove()
        mapRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const source = mapRef.current?.getSource('specimens') as GeoJSONSource | undefined
    source?.setData(toFeatureCollection(points))
  }, [points])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#f5f5f5', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Compass size={20} style={{ color: '#06b6d4' }} /> Community Map
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#525252' }}>Public specimens — locations obfuscated to ~10 km</p>
      </div>

      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid #1a1a1a' }}>
        {mapError ? (
          <div style={{ height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: '#ef4444', fontSize: 14 }}>
            {mapError}
          </div>
        ) : (
          <div ref={mapContainer} style={{ height: 420, background: '#0a0a0a' }} />
        )}

        {/* Legend */}
        <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.8)', border: '1px solid #222', borderRadius: 8, padding: '8px 12px', backdropFilter: 'blur(8px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#a3a3a3', fontSize: 12 }}>
            <Layers size={12} />
            <span>{points.length} specimens</span>
          </div>
        </div>
      </div>

      {/* Selected point detail */}
      {selectedPoint && (
        <div style={{ background: '#0a0a0a', border: '1px solid #1a1a2e', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: 0, color: '#f5f5f5', fontSize: 16, fontWeight: 700 }}>{selectedPoint.mineral_name}</h3>
              <p style={{ margin: '4px 0 0', color: '#525252', fontSize: 13 }}>{selectedPoint.locality}</p>
            </div>
            <button
              onClick={() => setSelectedPoint(null)}
              style={{ background: 'none', border: 'none', color: '#525252', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Recent pins list */}
      <div>
        <h3 style={{ margin: '0 0 12px', color: '#f5f5f5', fontSize: 15, fontWeight: 600 }}>Recently Mapped</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {points.slice(0, 5).map(p => (
            <div
              key={p.id}
              onClick={() => setSelectedPoint(p)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 10, padding: '10px 14px', cursor: 'pointer' }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#f5f5f5', fontWeight: 600, fontSize: 14 }}>{p.mineral_name}</div>
                <div style={{ color: '#525252', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.locality}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
