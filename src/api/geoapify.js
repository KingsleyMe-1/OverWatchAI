const API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY

function requireKey() {
  if (!API_KEY) throw new Error('Missing VITE_GEOAPIFY_API_KEY')
}

export async function geocodeSearch(text) {
  requireKey()
  const url = new URL('https://api.geoapify.com/v1/geocode/search')
  url.searchParams.set('text', text)
  url.searchParams.set('filter', 'countrycode:ph')
  url.searchParams.set('apiKey', API_KEY)
  const response = await fetch(url)
  if (!response.ok) throw new Error('Geoapify geocode search failed')
  return response.json()
}

export async function geocodeAutocomplete(text) {
  requireKey()
  const url = new URL('https://api.geoapify.com/v1/geocode/autocomplete')
  url.searchParams.set('text', text)
  url.searchParams.set('filter', 'countrycode:ph')
  url.searchParams.set('apiKey', API_KEY)
  const response = await fetch(url)
  if (!response.ok) throw new Error('Geoapify autocomplete failed')
  return response.json()
}

export async function reverseGeocode(lat, lon) {
  requireKey()
  const url = new URL('https://api.geoapify.com/v1/geocode/reverse')
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lon))
  url.searchParams.set('apiKey', API_KEY)
  const response = await fetch(url)
  if (!response.ok) throw new Error('Geoapify reverse geocode failed')
  return response.json()
}

export async function getRoute(from, to, mode = 'drive') {
  requireKey()
  const url = new URL('https://api.geoapify.com/v1/routing')
  url.searchParams.set('waypoints', `${from.lat},${from.lon}|${to.lat},${to.lon}`)
  url.searchParams.set('mode', mode)
  url.searchParams.set('apiKey', API_KEY)
  const response = await fetch(url)
  if (!response.ok) throw new Error('Geoapify routing failed')
  return response.json()
}

export async function findNearbyFacilities(lat, lon, categories, radius = 5000) {
  requireKey()
  const url = new URL('https://api.geoapify.com/v2/places')
  url.searchParams.set('categories', categories.join(','))
  url.searchParams.set('filter', `circle:${lon},${lat},${radius}`)
  url.searchParams.set('limit', '20')
  url.searchParams.set('apiKey', API_KEY)
  const response = await fetch(url)
  if (!response.ok) throw new Error('Geoapify places failed')
  return response.json()
}