export async function getPagasaWeather() {
  const response = await fetch('/api/scrape/pagasa/weather')
  if (!response.ok) throw new Error('Failed to fetch PAGASA weather')
  const payload = await response.json()
  return payload.data
}

export async function getPagasaFlood() {
  const response = await fetch('/api/scrape/pagasa/flood')
  if (!response.ok) throw new Error('Failed to fetch PAGASA flood')
  const payload = await response.json()
  return payload.data
}