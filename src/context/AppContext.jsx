/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext'

const AppContext = createContext(null)

function AppProvider({ children }) {
  const { user, profile, saveProfile } = useAuth()

  const [location, setLocation] = useState(null)
  const [agentState, setAgentState] = useState({
    risk: { status: 'idle', data: null, error: null },
    supplies: { status: 'idle', data: null, error: null },
    evacuation: { status: 'idle', data: null, error: null },
    comms: { status: 'idle', data: null, error: null },
  })

  const hydratedFromProfileRef = useRef(false)
  const persistTimerRef = useRef(null)

  useEffect(() => {
    if (!user || !profile) {
      hydratedFromProfileRef.current = false
      setLocation(null)
      return
    }

    if (hydratedFromProfileRef.current) return

    if (profile.location && profile.location.lat && profile.location.lon) {
      setLocation(profile.location)
    }

    hydratedFromProfileRef.current = true
  }, [user, profile])

  useEffect(() => {
    if (!user || !profile || !hydratedFromProfileRef.current) return
    if (!location) return

    const existing = profile.location
    const unchanged =
      existing &&
      Number(existing.lat) === Number(location.lat) &&
      Number(existing.lon) === Number(location.lon) &&
      String(existing.name || '') === String(location.name || '')

    if (unchanged) return

    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current)
    }

    persistTimerRef.current = setTimeout(() => {
      saveProfile({ location }).catch((error) => {
        console.error('[AppContext] Failed to persist location:', error.message)
      })
    }, 400)

    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current)
      }
    }
  }, [location, user, profile, saveProfile])

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