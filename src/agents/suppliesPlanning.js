import { generateJson } from '../api/gemini'
import { suppliesPrompt } from '../utils/prompts'

export async function runSuppliesPlanning(riskData) {
  return generateJson(suppliesPrompt(riskData), 'supplies checklist schema')
}