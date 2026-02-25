import { useMemo, useState } from 'react'
import Card from '../common/Card'
import Map from './Map'

function toMarker(feature, index) {
  const [lon, lat] = feature.geometry.coordinates
  return {
    id: feature.properties.place_id || `${feature.properties.name}-${index}`,
    name: feature.properties.name || feature.properties.formatted,
    lat,
    lon,
    category: feature.properties.categories?.[0] || 'unknown',
  }
}

export default function EvacuationPanel({ evacuation, location }) {
  const [selected, setSelected] = useState(0)

  const markers = useMemo(() => {
    const facilities = evacuation?.facilities || []
    return facilities.map(toMarker)
  }, [evacuation])

  const routeCoordinates = useMemo(() => {
    const route = evacuation?.routes?.[selected]?.route?.features?.[0]?.geometry?.coordinates || []
    return route.map(([lon, lat]) => [lat, lon])
  }, [evacuation, selected])

  return (
    <Card title="Evacuation Routing">
      <div className="space-y-3">
        <Map location={location} markers={markers} routeCoordinates={routeCoordinates} />
        <ul className="space-y-2 text-sm">
          {(markers || []).map((marker, index) => (
            <li key={marker.id}>
              <button
                onClick={() => setSelected(index)}
                className="w-full rounded border border-slate-200 px-3 py-2 text-left"
              >
                {marker.name} ({marker.category})
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}