const BASE = 'https://api.open-meteo.com/v1/forecast'

export async function getWeatherForecast(lat, lon) {
  const url = new URL(BASE)
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lon))
  url.searchParams.set(
    'hourly',
    'temperature_2m,relative_humidity_2m,precipitation,windspeed_10m,windgusts_10m,pressure_msl,weathercode',
  )
  url.searchParams.set(
    'daily',
    'weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,windgusts_10m_max',
  )
  url.searchParams.set('timezone', 'Asia/Manila')
  url.searchParams.set('forecast_days', '7')

  const response = await fetch(url)
  if (!response.ok) throw new Error('Open-Meteo request failed')
  return response.json()
}