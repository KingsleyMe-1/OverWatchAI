import { useEffect, useMemo, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''
const ROUTE_SOURCE_ID = 'route-source'
const ROUTE_LAYER_ID = 'route-layer'

const travelProfiles = {
  drive: 'mapbox/driving',
  walk: 'mapbox/walking',
  transit: 'mapbox/driving-traffic', // Mapbox has no transit routing; driving-traffic is a fallback
}

function formatTextDistance(meters) {
  if (!meters && meters !== 0) return ''
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

function formatTextDuration(seconds) {
  if (!seconds && seconds !== 0) return ''
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins} min`
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  return rem > 0 ? `${hrs} hr ${rem} min` : `${hrs} hr`
}

export default function Map({
  location,
  markers = [],
  selectedMarker = null,
  travelMode = 'drive',
  onDirectionsResult = null,
}) {
  const [error, setError] = useState('')
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const mapLoadedRef = useRef(false)
  const userMarkerRef = useRef(null)
  const facilityMarkersRef = useRef([])

  const center = useMemo(() => ({ lat: location.lat, lng: location.lon }), [location])
  const showMarkers = !selectedMarker

  // Initialize map
  useEffect(() => {
    if (!MAPBOX_TOKEN) {
      setError('Missing Mapbox token')
      return undefined
    }

    mapboxgl.accessToken = MAPBOX_TOKEN
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [center.lng, center.lat],
      zoom: 13,
      attributionControl: true,
    })

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right')
    map.on('load', () => {
      mapLoadedRef.current = true
    })
    mapRef.current = map

    return () => {
      facilityMarkersRef.current.forEach((m) => m.remove())
      facilityMarkersRef.current = []
      userMarkerRef.current?.remove()
      if (map.getLayer(ROUTE_LAYER_ID)) map.removeLayer(ROUTE_LAYER_ID)
      if (map.getSource(ROUTE_SOURCE_ID)) map.removeSource(ROUTE_SOURCE_ID)
      map.remove()
    }
  }, [center.lat, center.lng])

  // Keep map centered on current location
  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.setCenter([center.lng, center.lat])
  }, [center])

  // Render user marker
  useEffect(() => {
    if (!mapRef.current) return
    userMarkerRef.current?.remove()
    const marker = new mapboxgl.Marker({ color: '#2563eb' })
      .setLngLat([center.lng, center.lat])
      .setPopup(new mapboxgl.Popup({ offset: 12 }).setText('📍 Your Location'))
    marker.addTo(mapRef.current)
    userMarkerRef.current = marker
  }, [center])

  // Render facility markers when nothing is selected
  useEffect(() => {
    if (!mapRef.current) return
    facilityMarkersRef.current.forEach((m) => m.remove())
    facilityMarkersRef.current = []
    if (!showMarkers) return

    facilityMarkersRef.current = markers.map((marker) => {
      const m = new mapboxgl.Marker({ color: '#ef4444' })
        .setLngLat([marker.lon, marker.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 10 }).setHTML(
            `<div style="font-weight:600">${marker.name}</div><div style="color:#475569">${marker.category || 'Facility'}</div>`,
          ),
        )
      m.addTo(mapRef.current)
      return m
    })
  }, [markers, showMarkers])

  // Fetch and render route using Mapbox Directions API
  useEffect(() => {
    if (!mapRef.current || !mapLoadedRef.current) return

    const map = mapRef.current

    if (!selectedMarker) {
      if (map.getLayer(ROUTE_LAYER_ID)) map.removeLayer(ROUTE_LAYER_ID)
      if (map.getSource(ROUTE_SOURCE_ID)) map.removeSource(ROUTE_SOURCE_ID)
      onDirectionsResult?.(null)
      return
    }

    const profile = travelProfiles[travelMode] || travelProfiles.drive
    const url = new URL(`https://api.mapbox.com/directions/v5/${profile}/${center.lng},${center.lat};${selectedMarker.lon},${selectedMarker.lat}`)
    url.searchParams.set('alternatives', 'false')
    url.searchParams.set('geometries', 'geojson')
    url.searchParams.set('overview', 'full')
    url.searchParams.set('steps', 'true')
    url.searchParams.set('access_token', MAPBOX_TOKEN)

    let aborted = false
    fetch(url.toString())
      .then((res) => res.json())
      .then((data) => {
        if (aborted) return
        const route = data?.routes?.[0]
        const leg = route?.legs?.[0]
        if (!route || !leg) {
          onDirectionsResult?.(null)
          setError('No route found')
          return
        }

        const steps = leg.steps?.map((s) => s.maneuver?.instruction || '') || []
        onDirectionsResult?.({
          distanceMeters: leg.distance ?? route.distance,
          durationSeconds: leg.duration ?? route.duration,
          steps,
          distanceText: formatTextDistance(leg.distance ?? route.distance),
          durationText: formatTextDuration(leg.duration ?? route.duration),
        })

        const geometry = route.geometry
        if (geometry?.coordinates?.length) {
          const sourceData = {
            type: 'Feature',
            geometry,
            properties: {},
          }

          if (!map.getSource(ROUTE_SOURCE_ID)) {
            map.addSource(ROUTE_SOURCE_ID, {
              type: 'geojson',
              data: sourceData,
            })
          } else {
            map.getSource(ROUTE_SOURCE_ID).setData(sourceData)
          }

          if (!map.getLayer(ROUTE_LAYER_ID)) {
            map.addLayer({
              id: ROUTE_LAYER_ID,
              type: 'line',
              source: ROUTE_SOURCE_ID,
              layout: {
                'line-join': 'round',
                'line-cap': 'round',
              },
              paint: {
                'line-color': '#2563eb',
                'line-width': 5,
                'line-opacity': 0.85,
              },
            })
          }

          const bounds = geometry.coordinates.reduce(
            (b, coord) => b.extend(coord),
            new mapboxgl.LngLatBounds(geometry.coordinates[0], geometry.coordinates[0]),
          )
          map.fitBounds(bounds, { padding: 40 })
        }
      })
      .catch((err) => {
        if (aborted) return
        console.error('Route fetch failed', err)
        setError('Route fetch failed')
        onDirectionsResult?.(null)
      })

    return () => {
      aborted = true
    }
  }, [center, onDirectionsResult, selectedMarker, travelMode])

  if (error) {
    return (
      <div className="flex h-72 w-full items-center justify-center rounded-lg bg-slate-100 text-sm text-red-500">
        {error}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="h-80 w-full overflow-hidden rounded-lg"
      style={{ minHeight: '320px' }}
    />
  )
}
