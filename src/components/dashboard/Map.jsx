import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet'

const makeSvgIcon = (color = '#3b82f6', size = 32) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size * 1.4}" viewBox="0 0 24 34">
    <path d="M12 0C5.383 0 0 5.383 0 12c0 9 12 22 12 22s12-13 12-22C24 5.383 18.617 0 12 0z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="5" fill="#fff"/>
  </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [size, size * 1.4],
    iconAnchor: [size / 2, size * 1.4],
    popupAnchor: [0, -size * 1.2],
  })
}

const userIcon = makeSvgIcon('#3b82f6', 32)
const facilityIcon = makeSvgIcon('#ef4444', 28)

export default function Map({ location, markers = [], routeCoordinates = [] }) {
  const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY
  const center = [location.lat, location.lon]

  return (
    <MapContainer center={center} zoom={12} className="h-72 w-full rounded-lg">
      <TileLayer url={`https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${apiKey}`} />
      <Marker position={center} icon={userIcon} />
      {markers.map((marker) => (
        <Marker key={marker.id} position={[marker.lat, marker.lon]} icon={facilityIcon} />
      ))}
      {routeCoordinates.length > 0 ? <Polyline positions={routeCoordinates} color="blue" /> : null}
    </MapContainer>
  )
}