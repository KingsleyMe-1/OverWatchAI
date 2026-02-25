import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { geocodeAutocomplete, reverseGeocode } from '../../api/geoapify'
import { useAppContext } from '../../context/AppContext'

export default function LocationInput() {
  const navigate = useNavigate()
  const { setLocation } = useAppContext()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])

  useEffect(() => {
    const performSearch = async () => {
      if (query.length < 3) {
        setResults([])
        return
      }
      try {
        const data = await geocodeAutocomplete(query)
        setResults(data.features || [])
      } catch {
        setResults([])
      }
    }

    const id = setTimeout(performSearch, 350)
    return () => clearTimeout(id)
  }, [query])

  async function useMyLocation() {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude
      const lon = pos.coords.longitude
      const rev = await reverseGeocode(lat, lon)
      const feature = rev.features?.[0]
      setLocation({ lat, lon, name: feature?.properties?.formatted || 'Current location' })
      navigate('/dashboard')
    })
  }

  function selectFeature(feature) {
    const [lon, lat] = feature.geometry.coordinates
    setLocation({ lat, lon, name: feature.properties.formatted })
    navigate('/dashboard')
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Choose your location</h2>
      <div className="mt-4 flex flex-col gap-3">
        <button onClick={useMyLocation} className="rounded-lg border border-slate-300 px-4 py-2 text-left">
          Use My Location
        </button>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search city or municipality"
          className="rounded-lg border border-slate-300 px-3 py-2"
        />
        <ul className="space-y-2">
          {results.slice(0, 5).map((feature) => (
            <li key={feature.properties.place_id}>
              <button className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left" onClick={() => selectFeature(feature)}>
                {feature.properties.formatted}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}