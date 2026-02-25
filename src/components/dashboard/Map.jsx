import 'leaflet/dist/leaflet.css'
import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet'

export default function Map({ location, markers = [], routeCoordinates = [] }) {
  const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY
  const center = [location.lat, location.lon]

  return (
    <MapContainer center={center} zoom={12} className="h-72 w-full rounded-lg">
      <TileLayer url={`https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${apiKey}`} />
      <Marker position={center} />
      {markers.map((marker) => (
        <Marker key={marker.id} position={[marker.lat, marker.lon]} />
      ))}
      {routeCoordinates.length > 0 ? <Polyline positions={routeCoordinates} color="blue" /> : null}
    </MapContainer>
  )
}