import { findNearbyFacilities, getRoute } from '../api/geoapify'
import { generateJson } from '../api/gemini'
import { evacuationPrompt } from '../utils/prompts'

const CATEGORIES = ['healthcare.hospital', 'education.school', 'service.fire_station', 'service.police']

export async function runEvacuationRouting(location, riskData, profile) {
  const facilities = await findNearbyFacilities(location.lat, location.lon, CATEGORIES, 5000)

  const top = (facilities.features || []).slice(0, 5)
  const routes = await Promise.all(
    top.map(async (feature) => {
      const [lon, lat] = feature.geometry.coordinates
      const route = await getRoute(
        { lat: location.lat, lon: location.lon },
        { lat, lon },
        'drive',
      )
      return { feature, route }
    }),
  )

  const recommendations = await generateJson(
    evacuationPrompt({
      location,
      riskData,
      facilities: top,
      profile: {
        household: profile?.household || {},
        vehicleType: profile?.vehicle_type || 'none',
        medicalNotes: profile?.medical_notes || '',
        pets: profile?.pets || [],
      },
    }),
    'evacuation recommendations schema',
  )

  return { facilities: top, routes, recommendations }
}