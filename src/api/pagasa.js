const SCRAPER_URL = import.meta.env.SCRAPER_URL || ''

export async function getPagasaWeather() {
  const response = await fetch(`${SCRAPER_URL}/api/scrape/pagasa/weather`)
  if (!response.ok) throw new Error('Failed to fetch PAGASA weather')
  const payload = await response.json()
  return payload.data
}

export async function getPagasaFlood() {
  const response = await fetch(`${SCRAPER_URL}/api/scrape/pagasa/flood`)
  if (!response.ok) throw new Error('Failed to fetch PAGASA flood')
  const payload = await response.json()
  return payload.data
}