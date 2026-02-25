import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { useAgents } from '../../hooks/useAgents'
import LoadingSpinner from '../common/LoadingSpinner'
import AgentStatusBar from './AgentStatusBar'
import CommsPanel from './CommsPanel'
import EvacuationPanel from './EvacuationPanel'
import RiskPanel from './RiskPanel'
import SuppliesPanel from './SuppliesPanel'

export default function Dashboard() {
  const navigate = useNavigate()
  const { location, agentState } = useAppContext()
  const { runAllAgents } = useAgents()

  useEffect(() => {
    if (!location) {
      navigate('/setup')
      return
    }
    runAllAgents()
  }, [location, navigate, runAllAgents])

  if (!location) return <LoadingSpinner label="Preparing dashboard..." />

  return (
    <div className="space-y-4">
      <AgentStatusBar state={agentState} />
      <div className="grid gap-4 lg:grid-cols-2">
        <RiskPanel risk={agentState.risk.data} />
        <SuppliesPanel supplies={agentState.supplies.data} />
        <EvacuationPanel evacuation={agentState.evacuation.data} location={location} />
        <CommsPanel comms={agentState.comms.data} />
      </div>
    </div>
  )
}