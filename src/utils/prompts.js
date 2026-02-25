export function riskPrompt(input) {
  return `Analyze disaster risk for ${input.locationName} in the Philippines. Data: ${JSON.stringify(
    input,
  )}. Return JSON: {"riskLevel":"low|moderate|high|extreme","activeThreats":[],"summary":""}`
}

export function suppliesPrompt(input) {
  return `Generate a Philippines-focused emergency supply checklist based on: ${JSON.stringify(
    input,
  )}. Return JSON: {"categories":[{"name":"","items":[{"name":"","quantity":"","reason":""}]}]}`
}

export function evacuationPrompt(input) {
  return `Recommend evacuation priorities from facilities data: ${JSON.stringify(
    input,
  )}. Return JSON: {"recommendations":[],"topFacilities":[]}`
}

export function commsPrompt(input) {
  const locationName = input.location?.name || 'the area'
  const evac = input.riskData?.topFacilities?.[0] || input.riskData?.recommendations?.[0] || ''
  return `Generate bilingual Filipino/English emergency communication drafts for someone located in "${locationName}", Philippines.
Use the ACTUAL location name "${locationName}" in every message — never leave placeholder brackets like [location].
Incorporate specific evacuation points or meeting places from the risk data when available: ${JSON.stringify(evac)}.
Risk context: ${JSON.stringify(input.riskData)}.
Return JSON: {"sms":"<SMS in Filipino using real location name and nearest evacuation point>","barangayNotice":"<formal report in Filipino>","socialPost":"<English safety check-in post>","meetingPlan":"<specific meeting plan with real landmarks>"}`
}