import { getEonetEvents, getGdacsRss, getReliefwebReports, getUsgsEarthquakes } from '../api/disasters'
import { generateJson } from '../api/gemini'
import { getPagasaFlood, getPagasaWeather } from '../api/pagasa'
import { getPhivolcsEarthquakes, getPhivolcsVolcanoes } from '../api/phivolcs'
import { getWeatherForecast } from '../api/weather'
import { riskPrompt } from '../utils/prompts'

export async function runRiskAssessment(location) {
  const [weather, usgs, eonet, gdacs, reliefweb, pagasaWeather, pagasaFlood, phEq, phVol] =
    await Promise.all([
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

  const input = {
    locationName: location.name,
    weather,
    usgs,
    eonet,
    gdacs,
    reliefweb,
    pagasaWeather,
    pagasaFlood,
    phivolcsEarthquakes: phEq,
    phivolcsVolcanoes: phVol,
  }

  return generateJson(riskPrompt(input), 'risk assessment schema')
}