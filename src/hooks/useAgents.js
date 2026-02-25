import { useCallback } from 'react'
import { runAllAgents } from '../agents/orchestrator'
import { useAppContext } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'

export function useAgents() {
  const { location, agentState, setAgentState } = useAppContext()
  const { profile } = useAuth()

  const run = useCallback(async () => {
    if (!location) return
    await runAllAgents(location, profile, setAgentState)
  }, [location, profile, setAgentState])

  return {
    location,
    agentState,
    runAllAgents: run,
  }
}