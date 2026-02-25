export async function getPhivolcsEarthquakes() {
  const response = await fetch('/api/scrape/phivolcs/earthquakes')
  if (!response.ok) throw new Error('Failed to fetch PHIVOLCS earthquakes')
  const payload = await response.json()
  return payload.data
}

export async function getPhivolcsVolcanoes() {
  const response = await fetch('/api/scrape/phivolcs/volcanoes')
  if (!response.ok) throw new Error('Failed to fetch PHIVOLCS volcanoes')
  const payload = await response.json()
  return payload.data
}