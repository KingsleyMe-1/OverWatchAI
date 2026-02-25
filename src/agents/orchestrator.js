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

export async function runAllAgents(location, setAgentState) {
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

    // Step 1 — Risk assessment must run first
    const risk = await runAgent('risk', () => runRiskAssessment(location), setAgentState)

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

    // Step 2 — Run remaining agents sequentially to avoid rate limits
    await runAgent('supplies', () => runSuppliesPlanning(risk), setAgentState)
    await runAgent('evacuation', () => runEvacuationRouting(location, risk), setAgentState)
    await runAgent('comms', () => runCommunicationDraft(location, risk), setAgentState)
  } finally {
    _running = false
  }
}