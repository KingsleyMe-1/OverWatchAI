import { PH_BBOX } from '../utils/constants'

export async function getUsgsEarthquakes() {
  const url = new URL('https://earthquake.usgs.gov/fdsnws/event/1/query')
  url.searchParams.set('format', 'geojson')
  url.searchParams.set('minlatitude', String(PH_BBOX.minLat))
  url.searchParams.set('maxlatitude', String(PH_BBOX.maxLat))
  url.searchParams.set('minlongitude', String(PH_BBOX.minLon))
  url.searchParams.set('maxlongitude', String(PH_BBOX.maxLon))
  url.searchParams.set('minmagnitude', '2.5')
  url.searchParams.set('orderby', 'time')
  url.searchParams.set('limit', '50')
  const response = await fetch(url)
  if (!response.ok) throw new Error('USGS request failed')
  return response.json()
}

export async function getEonetEvents() {
  const url =
    'https://eonet.gsfc.nasa.gov/api/v3/events/geojson?status=open&bbox=116,4.5,127,21.5&limit=50'
  const response = await fetch(url)
  if (!response.ok) throw new Error('EONET request failed')
  return response.json()
}

export async function getGdacsRss() {
  const response = await fetch('https://www.gdacs.org/xml/rss.xml')
  if (!response.ok) throw new Error('GDACS request failed')
  return response.text()
}

export async function getReliefwebReports() {
  const url =
    'https://api.reliefweb.int/v2/reports?appname=overwatch-ai&filter[field]=country.name&filter[value]=Philippines&sort[]=date:desc&limit=10'
  const response = await fetch(url)
  if (!response.ok) throw new Error('ReliefWeb request failed')
  return response.json()
}