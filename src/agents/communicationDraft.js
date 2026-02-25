import { generateJson } from '../api/gemini'
import { commsPrompt } from '../utils/prompts'

export async function runCommunicationDraft(location, riskData) {
  return generateJson(commsPrompt({ location, riskData }), 'communication drafts schema')
}