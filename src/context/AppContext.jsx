/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from 'react'

const AppContext = createContext(null)

function AppProvider({ children }) {
  const [location, setLocation] = useState(null)
  const [agentState, setAgentState] = useState({
    risk: { status: 'idle', data: null, error: null },
    supplies: { status: 'idle', data: null, error: null },
    evacuation: { status: 'idle', data: null, error: null },
    comms: { status: 'idle', data: null, error: null },
  })

  const value = useMemo(
    () => ({ location, setLocation, agentState, setAgentState }),
    [location, agentState],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

function useAppContext() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider')
  return ctx
}

export { AppProvider, useAppContext }