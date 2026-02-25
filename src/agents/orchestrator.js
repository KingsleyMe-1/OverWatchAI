import { runCommunicationDraft } from './communicationDraft'
import { runEvacuationRouting } from './evacuationRouting'
import { runRiskAssessment } from './riskAssessment'
import { runSuppliesPlanning } from './suppliesPlanning'

export async function runAllAgents(location, setAgentState) {
  setAgentState((prev) => ({
    ...prev,
    risk: { status: 'running', data: null, error: null },
    supplies: { status: 'idle', data: null, error: null },
    evacuation: { status: 'idle', data: null, error: null },
    comms: { status: 'idle', data: null, error: null },
  }))

  try {
    const risk = await runRiskAssessment(location)
    setAgentState((prev) => ({ ...prev, risk: { status: 'complete', data: risk, error: null } }))

    setAgentState((prev) => ({
      ...prev,
      supplies: { ...prev.supplies, status: 'running' },
      evacuation: { ...prev.evacuation, status: 'running' },
      comms: { ...prev.comms, status: 'running' },
    }))

    const [supplies, evacuation, comms] = await Promise.all([
      runSuppliesPlanning(risk),
      runEvacuationRouting(location, risk),
      runCommunicationDraft(location, risk),
    ])

    setAgentState((prev) => ({
      ...prev,
      supplies: { status: 'complete', data: supplies, error: null },
      evacuation: { status: 'complete', data: evacuation, error: null },
      comms: { status: 'complete', data: comms, error: null },
    }))
  } catch (error) {
    setAgentState((prev) => ({
      ...prev,
      risk: { status: 'error', data: null, error: error.message },
    }))
  }
}