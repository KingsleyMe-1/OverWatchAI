import { generateJson } from '../api/gemini'
import { commsPrompt } from '../utils/prompts'

export async function runCommunicationDraft(location, riskData, profile) {
  return generateJson(
    commsPrompt({
      location,
      riskData,
      profile: {
        fullName: profile?.full_name || '',
        emergencyContacts: profile?.emergency_contacts || [],
      },
    }),
    'communication drafts schema',
  )
}