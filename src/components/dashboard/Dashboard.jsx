import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
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
  const { profile } = useAuth()
  const { location, agentState } = useAppContext()
  const { runAllAgents } = useAgents()
  const hasRun = useRef(false)

  useEffect(() => {
    if (!location) {
      navigate('/setup')
      return
    }
    if (hasRun.current) return
    hasRun.current = true
    runAllAgents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])

  if (!location) return <LoadingSpinner label="Preparing dashboard..." />

  return (
    <div className="space-y-4">
      <AgentStatusBar state={agentState} />
      <div className="grid gap-4 lg:grid-cols-2">
        <RiskPanel risk={agentState.risk.data} />
        <SuppliesPanel supplies={agentState.supplies.data} />
        <EvacuationPanel evacuation={agentState.evacuation.data} location={location} />
        <CommsPanel comms={agentState.comms.data} contacts={profile?.emergency_contacts || []} />
      </div>
    </div>
  )
}