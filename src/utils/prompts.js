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
  return `Generate bilingual Filipino/English emergency communication drafts from: ${JSON.stringify(
    input,
  )}. Return JSON: {"sms":"","barangayNotice":"","socialPost":"","meetingPlan":""}`
}