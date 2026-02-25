import { getEonetEvents, getGdacsRss, getReliefwebReports, getUsgsEarthquakes } from '../api/disasters'
import { generateJson } from '../api/gemini'
import { getPagasaFlood, getPagasaWeather } from '../api/pagasa'
import { getPhivolcsEarthquakes, getPhivolcsVolcanoes } from '../api/phivolcs'
import { getWeatherForecast } from '../api/weather'
import { riskPrompt } from '../utils/prompts'

function normalizeProfile(profile) {
  if (!profile) return null
  return {
    fullName: profile.full_name || '',
    household: profile.household || {},
    medicalNotes: profile.medical_notes || '',
    pets: profile.pets || [],
    vehicleType: profile.vehicle_type || 'none',
    work: {
      location: profile.work_location || '',
      hours: profile.work_hours || '',
      dayOff: profile.work_day_off || '',
    },
    emergencyContacts: profile.emergency_contacts || [],
  }
}

export async function runRiskAssessment(location, profile) {
  const results = await Promise.allSettled([
    getWeatherForecast(location.lat, location.lon),
    getUsgsEarthquakes(),
    getEonetEvents(),
    getGdacsRss(),
    getReliefwebReports(),
    getPagasaWeather(),
    getPagasaFlood(),
    getPhivolcsEarthquakes(),
    getPhivolcsVolcanoes(),
  ])

  const resolve = (r, fallback = null) =>
    r.status === 'fulfilled' ? r.value : fallback

  const [weather, usgs, eonet, gdacs, reliefweb, pagasaWeather, pagasaFlood, phEq, phVol] =
    results.map((r) => resolve(r))

  // Log failed sources for debugging
  const labels = ['weather', 'usgs', 'eonet', 'gdacs', 'reliefweb', 'pagasaWeather', 'pagasaFlood', 'phivolcsEq', 'phivolcsVol']
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.warn(`[RiskAssessment] ${labels[i]} failed:`, r.reason?.message || r.reason)
    }
  })

  // Trim data to reduce token usage
  const trimEarthquakes = (data) => {
    if (!data) return null
    const features = data?.features || data
    const items = Array.isArray(features) ? features.slice(0, 10) : features
    return items
  }

  const input = {
    locationName: location.name,
    profile: normalizeProfile(profile),
    weather: weather
      ? {
          daily: weather.daily,
          timezone: weather.timezone,
        }
      : null,
    usgs: usgs ? trimEarthquakes(usgs) : null,
    eonet: eonet?.features?.slice(0, 10) || null,
    gdacs: gdacs ? String(gdacs).slice(0, 2000) : null,
    reliefweb: reliefweb?.data?.slice(0, 5) || null,
    pagasaWeather: pagasaWeather || null,
    pagasaFlood: pagasaFlood || null,
    phivolcsEarthquakes: phEq ? phEq.slice(0, 10) : null,
    phivolcsVolcanoes: phVol ? phVol.slice(0, 10) : null,
  }

  return generateJson(riskPrompt(input), 'risk assessment schema')
}