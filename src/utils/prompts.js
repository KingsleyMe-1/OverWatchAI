function profileContext(profile) {
  if (!profile) return 'No profile data provided.'
  return JSON.stringify(profile)
}

export function riskPrompt(input) {
  return `Analyze disaster risk for ${input.locationName} in the Philippines.
Personal profile context: ${profileContext(input.profile)}.
Risk data: ${JSON.stringify(input)}.
Prioritize medical conditions, mobility constraints, household composition, and work exposure timing.
Return JSON: {"riskLevel":"low|moderate|high|extreme","activeThreats":[],"summary":""}`
}

export function suppliesPrompt(input) {
  return `Generate a Philippines-focused emergency supply checklist.
Risk context: ${JSON.stringify(input.riskData)}.
Personal profile context: ${profileContext(input.profile)}.
Scale quantities based on household composition, include pet supplies, and include medically necessary items.
Return JSON: {"categories":[{"name":"","items":[{"name":"","quantity":"","reason":""}]}]}`
}

export function evacuationPrompt(input) {
  return `Recommend evacuation priorities and routing.
Location and facilities: ${JSON.stringify({ location: input.location, facilities: input.facilities })}.
Risk context: ${JSON.stringify(input.riskData)}.
Personal profile context: ${profileContext(input.profile)}.
Account for vehicle availability and mobility limitations.
Return JSON: {"recommendations":[],"topFacilities":[]}`
}

export function commsPrompt(input) {
  const locationName = input.location?.name || 'the area'
  return `Generate bilingual Filipino/English emergency communication drafts for someone located in "${locationName}", Philippines.
Use the real location name "${locationName}" in every output.
Risk context: ${JSON.stringify(input.riskData)}.
Personal profile context: ${profileContext(input.profile)}.
Use the person's name and emergency contact context in tone and guidance.
Return JSON: {"sms":"","barangayNotice":"","socialPost":"","meetingPlan":""}`
}