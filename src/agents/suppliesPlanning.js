import { generateJson } from '../api/gemini'
import { suppliesPrompt } from '../utils/prompts'

export async function runSuppliesPlanning(riskData, profile) {
  return generateJson(
    suppliesPrompt({
      riskData,
      profile: {
        fullName: profile?.full_name || '',
        household: profile?.household || {},
        pets: profile?.pets || [],
        medicalNotes: profile?.medical_notes || '',
      },
    }),
    'supplies checklist schema',
  )
}