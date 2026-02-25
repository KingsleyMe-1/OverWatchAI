import { useCallback, useMemo, useState } from 'react'
import { Car, Footprints, MapPin, Navigation, Train } from 'lucide-react'
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
    address: feature.properties.formatted || '',
    distance: feature.properties.distance,
  }
}

function formatDuration(seconds) {
  if (!seconds) return ''
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins} min`
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  return rem > 0 ? `${hrs} hr ${rem} min` : `${hrs} hr`
}

function formatDistance(meters) {
  if (!meters) return ''
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

const travelModes = [
  { key: 'drive', label: 'Drive', Icon: Car },
  { key: 'walk', label: 'Walk', Icon: Footprints },
  { key: 'transit', label: 'Transit', Icon: Train },
]

export default function EvacuationPanel({ evacuation, location }) {
  const [selected, setSelected] = useState(null)
  const [travelMode, setTravelMode] = useState('drive')
  const [routeInfo, setRouteInfo] = useState(null)

  const markers = useMemo(() => {
    const facilities = evacuation?.facilities || []
    return facilities.map(toMarker)
  }, [evacuation])

  const selectedMarker = selected !== null ? markers[selected] : null

  const handleDirectionsResult = useCallback((result) => {
    if (result) {
      setRouteInfo({
        distance: result.distanceText || formatDistance(result.distanceMeters),
        duration: result.durationText || formatDuration(result.durationSeconds),
        steps: result.steps || [],
      })
    } else {
      setRouteInfo(null)
    }
  }, [])

  const openGoogleMapsNav = () => {
    if (!selectedMarker) return
    const mode = travelMode === 'drive' ? 'driving' : travelMode === 'walk' ? 'walking' : 'transit'
    const url = `https://www.google.com/maps/dir/?api=1&origin=${location.lat},${location.lon}&destination=${selectedMarker.lat},${selectedMarker.lon}&travelmode=${mode}`
    window.open(url, '_blank')
  }

  return (
    <Card title="Evacuation Routing">
      <div className="space-y-3">
        {/* Map */}
        <Map
          location={location}
          markers={markers}
          selectedMarker={selectedMarker}
          travelMode={travelMode}
          onDirectionsResult={handleDirectionsResult}
        />

        {/* Travel mode selector */}
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {travelModes.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTravelMode(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                travelMode === key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Route summary when a destination is selected */}
        {selectedMarker && routeInfo && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div className="mb-2 flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-900">{selectedMarker.name}</p>
                <p className="mt-0.5 text-xs text-blue-700">
                  {routeInfo.distance} · {routeInfo.duration}
                </p>
              </div>
              <button
                onClick={openGoogleMapsNav}
                className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                <Navigation size={14} />
                Navigate
              </button>
            </div>
            {routeInfo.steps.length > 0 && (
              <details className="mt-1">
                <summary className="cursor-pointer text-xs font-medium text-blue-700 hover:text-blue-900">
                  Step-by-step directions ({routeInfo.steps.length} steps)
                </summary>
                <ol className="mt-2 max-h-40 list-inside list-decimal space-y-1 overflow-y-auto text-xs text-blue-800">
                  {routeInfo.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </details>
            )}
          </div>
        )}

        {/* Facility list */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-slate-500">
            Nearby Evacuation Points ({markers.length})
          </p>
          <ul className="space-y-1.5 text-sm">
            {markers.map((marker, index) => {
              const isActive = selected === index
              return (
                <li key={marker.id}>
                  <button
                    onClick={() => setSelected(isActive ? null : index)}
                    className={`flex w-full items-start gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      isActive
                        ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200'
                        : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                    }`}
                  >
                    <MapPin
                      size={16}
                      className={`mt-0.5 shrink-0 ${isActive ? 'text-blue-600' : 'text-red-500'}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium ${isActive ? 'text-blue-900' : 'text-slate-800'}`}>
                        {marker.name}
                      </p>
                      <p className="truncate text-xs text-slate-500">{marker.category}</p>
                      {marker.distance && (
                        <p className="text-xs text-slate-400">
                          {formatDistance(marker.distance)} away
                        </p>
                      )}
                    </div>
                    {isActive && (
                      <span className="shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                        Selected
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Open in Google Maps fallback link */}
        {selectedMarker && (
          <button
            onClick={openGoogleMapsNav}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <img
              src="https://www.google.com/images/branding/product/ico/maps15_bnuw3a_32dp.ico"
              alt=""
              className="h-4 w-4"
            />
            Open in Google Maps
          </button>
        )}
      </div>
    </Card>
  )
}