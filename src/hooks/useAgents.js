import { useCallback } from 'react'
import { runAllAgents } from '../agents/orchestrator'
import { useAppContext } from '../context/AppContext'

export function useAgents() {
  const { location, agentState, setAgentState } = useAppContext()

  const run = useCallback(async () => {
    if (!location) return
    await runAllAgents(location, setAgentState)
  }, [location, setAgentState])

  return {
    location,
    agentState,
    runAllAgents: run,
  }
}