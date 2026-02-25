/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

const PROFILE_SELECT = `
  id,
  full_name,
  household,
  medical_notes,
  pets,
  vehicle_type,
  work_location,
  work_hours,
  work_day_off,
  emergency_contacts,
  location,
  profile_completed,
  updated_at
`

const EMPTY_PROFILE = {
  full_name: '',
  household: { adults: 1, children: 0, elderly: 0 },
  medical_notes: '',
  pets: [{ type: '', count: 0 }],
  vehicle_type: 'none',
  work_location: '',
  work_hours: '',
  work_day_off: '',
  emergency_contacts: [{ name: '', phone: '', relationship: '' }],
  location: null,
  profile_completed: false,
}

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function hasValidContacts(contacts) {
  if (!Array.isArray(contacts) || contacts.length === 0) return false
  return contacts.some((contact) =>
    [contact?.name, contact?.phone, contact?.relationship].every(
      (value) => typeof value === 'string' && value.trim().length > 0,
    ),
  )
}

function hasValidPets(pets) {
  if (!Array.isArray(pets) || pets.length === 0) return false
  return pets.some((pet) => {
    const type = typeof pet?.type === 'string' ? pet.type.trim() : ''
    const count = toNumber(pet?.count)
    return Boolean(type) && count > 0
  })
}

function isProfileComplete(profile) {
  if (!profile) return false

  const fullName = profile.full_name?.trim()
  const medicalNotes = profile.medical_notes?.trim()
  const workLocation = profile.work_location?.trim()
  const workHours = profile.work_hours?.trim()
  const workDayOff = profile.work_day_off?.trim()

  const household = profile.household || {}
  const adults = toNumber(household.adults)
  const children = toNumber(household.children)
  const elderly = toNumber(household.elderly)
  const householdTotal = adults + children + elderly

  const vehicleType = profile.vehicle_type?.trim()

  return (
    Boolean(fullName) &&
    householdTotal > 0 &&
    Boolean(medicalNotes) &&
    hasValidPets(profile.pets) &&
    Boolean(vehicleType) &&
    Boolean(workLocation) &&
    Boolean(workHours) &&
    Boolean(workDayOff) &&
    hasValidContacts(profile.emergency_contacts)
  )
}

function mergeWithDefaults(profile) {
  return {
    ...EMPTY_PROFILE,
    ...(profile || {}),
    household: {
      ...EMPTY_PROFILE.household,
      ...(profile?.household || {}),
    },
    pets: Array.isArray(profile?.pets) && profile.pets.length > 0 ? profile.pets : EMPTY_PROFILE.pets,
    emergency_contacts:
      Array.isArray(profile?.emergency_contacts) && profile.emergency_contacts.length > 0
        ? profile.emergency_contacts
        : EMPTY_PROFILE.emergency_contacts,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState('')

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      setProfileError(error.message)
      throw error
    }

    const merged = mergeWithDefaults(data)
    setProfileError('')
    setProfile(merged)
    return merged
  }

  async function refreshProfile() {
    if (!user) return null
    return loadProfile(user.id)
  }

  async function saveProfile(partialProfile) {
    if (!user) throw new Error('You must be logged in to save profile')

    const merged = mergeWithDefaults({ ...profile, ...partialProfile })
    const completed = isProfileComplete(merged)

    const payload = {
      id: user.id,
      full_name: merged.full_name,
      household: merged.household,
      medical_notes: merged.medical_notes,
      pets: merged.pets,
      vehicle_type: merged.vehicle_type,
      work_location: merged.work_location,
      work_hours: merged.work_hours,
      work_day_off: merged.work_day_off,
      emergency_contacts: merged.emergency_contacts,
      location: merged.location,
      profile_completed: completed,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload)
      .select(PROFILE_SELECT)
      .single()

    if (error) {
      setProfileError(error.message)
      throw error
    }

    const nextProfile = mergeWithDefaults(data)
    setProfileError('')
    setProfile(nextProfile)
    return nextProfile
  }

  async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  useEffect(() => {
    let mounted = true

    async function bootstrap() {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error

        const activeUser = data.session?.user || null
        if (!mounted) return

        setUser(activeUser)
        if (activeUser) {
          await loadProfile(activeUser.id)
        } else {
          setProfile(null)
        }
      } catch (error) {
        console.error('[Auth] bootstrap failed:', error.message)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    bootstrap()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const activeUser = session?.user || null
      setUser(activeUser)

      if (activeUser) {
        try {
          await loadProfile(activeUser.id)
        } catch {
          setProfile(null)
        }
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const profileComplete = useMemo(() => isProfileComplete(profile), [profile])

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      profileError,
      profileComplete,
      signUp,
      signIn,
      signOut,
      saveProfile,
      refreshProfile,
    }),
    [user, profile, loading, profileError, profileComplete],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}