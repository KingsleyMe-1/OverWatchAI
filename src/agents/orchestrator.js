import { runCommunicationDraft } from './communicationDraft'
import { runEvacuationRouting } from './evacuationRouting'
import { runRiskAssessment } from './riskAssessment'
import { runSuppliesPlanning } from './suppliesPlanning'

// Module-level lock — survives React StrictMode remounts
let _running = false

async function runAgent(key, fn, setAgentState) {
  setAgentState((prev) => ({ ...prev, [key]: { status: 'running', data: null, error: null } }))
  try {
    const data = await fn()
    setAgentState((prev) => ({ ...prev, [key]: { status: 'complete', data, error: null } }))
    return data
  } catch (error) {
    const msg = error?.message || String(error)
    console.error(`[Agent:${key}]`, msg)
    setAgentState((prev) => ({ ...prev, [key]: { status: 'error', data: null, error: msg } }))
    return null
  }
}

export async function runAllAgents(location, profile, setAgentState) {
  if (_running) {
    console.warn('[Orchestrator] Already running, skipping duplicate call')
    return
  }

  _running = true
  try {
    setAgentState((prev) => ({
      ...prev,
      risk: { status: 'running', data: null, error: null },
      supplies: { status: 'idle', data: null, error: null },
      evacuation: { status: 'idle', data: null, error: null },
      comms: { status: 'idle', data: null, error: null },
    }))

    const risk = await runAgent('risk', () => runRiskAssessment(location, profile), setAgentState)

    if (!risk) {
      const depError = 'Risk assessment failed — cannot proceed'
      setAgentState((prev) => ({
        ...prev,
        supplies: { status: 'error', data: null, error: depError },
        evacuation: { status: 'error', data: null, error: depError },
        comms: { status: 'error', data: null, error: depError },
      }))
      return
    }

    await runAgent('supplies', () => runSuppliesPlanning(risk, profile), setAgentState)
    await runAgent('evacuation', () => runEvacuationRouting(location, risk, profile), setAgentState)
    await runAgent('comms', () => runCommunicationDraft(location, risk, profile), setAgentState)
  } finally {
    _running = false
  }
}