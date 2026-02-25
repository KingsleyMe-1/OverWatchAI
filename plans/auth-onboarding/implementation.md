# Authentication & Personal Information Onboarding

## Goal
Implement Supabase authentication plus a required post-auth personal profile flow, then wire profile data into agent prompts so outputs are personalized and persistent across sessions.

## Technology Stack & Dependencies
- Frontend: React 19 + Vite 7 + React Router 7 + Tailwind 4
- Backend (unchanged for this feature): Express 4 scraper/proxy server
- New dependency: `@supabase/supabase-js`
- Package manager: npm

## Build / Validation Commands
- Frontend install: `npm install`
- Frontend lint: `npm run lint`
- Frontend build: `npm run build`
- Frontend dev: `npm run dev`
- Backend dev (optional for full app): `cd server && npm install && npm run dev`

## Prerequisites
Make sure that the user is currently on the `feat/auth-onboarding` branch before beginning implementation.
If not, move them to the correct branch. If the branch does not exist, create it from `main`.

### Step-by-Step Instructions

#### Step 1: Install Supabase and Create Auth Context
- [x] Install Supabase client in the frontend workspace:
  - Run: `npm install @supabase/supabase-js`
- [x] Replace `package.json` with:

```json
{
  "name": "overwatchai",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.57.4",
    "mapbox-gl": "^2.15.0",
    "@tailwindcss/vite": "^4.2.1",
    "leaflet": "^1.9.4",
    "lucide-react": "^0.554.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-leaflet": "^5.0.0",
    "react-router-dom": "^7.9.4",
    "tailwindcss": "^4.2.1"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.1",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.1",
    "eslint": "^9.39.1",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.4.24",
    "globals": "^16.5.0",
    "vite": "^7.3.1"
  }
}
```

- [x] Create `src/lib/supabase.js`:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
```

- [x] Create `src/context/AuthContext.jsx`:

```jsx
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

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('[Auth] loadProfile failed:', error.message)
      throw error
    }

    const merged = mergeWithDefaults(data)
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
      console.error('[Auth] saveProfile failed:', error.message)
      throw error
    }

    const nextProfile = mergeWithDefaults(data)
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
      profileComplete,
      signUp,
      signIn,
      signOut,
      saveProfile,
      refreshProfile,
    }),
    [user, profile, loading, profileComplete],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
```

- [x] Replace `src/main.jsx` with:

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { AppProvider } from './context/AppContext'
import { AuthProvider } from './context/AuthContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
```

- [x] In Supabase SQL Editor, run this SQL to create `profiles` table + RLS:

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  household jsonb not null default '{"adults":1,"children":0,"elderly":0}'::jsonb,
  medical_notes text not null default '',
  pets jsonb not null default '[{"type":"","count":0}]'::jsonb,
  vehicle_type text not null default 'none',
  work_location text not null default '',
  work_hours text not null default '',
  work_day_off text not null default '',
  emergency_contacts jsonb not null default '[{"name":"","phone":"","relationship":""}]'::jsonb,
  location jsonb,
  profile_completed boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "Users can insert own profile"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);
```

- [x] Add frontend env vars in `.env`:
  - `VITE_SUPABASE_URL=<your-project-url>`
  - `VITE_SUPABASE_ANON_KEY=<your-anon-key>`

##### Step 1 Verification Checklist
- [x] `npm run lint` passes
- [x] App boots without runtime errors
- [x] `useAuth()` returns `{ user: null, loading: false }` when logged out

#### Step 1 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 2: Build Login and Signup Pages
- [ ] Create `src/components/auth/LoginPage.jsx`:

```jsx
import { useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

function isEmailValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading, signIn } = useAuth()

  const [form, setForm] = useState({ email: '', password: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const from = useMemo(() => location.state?.from?.pathname || '/dashboard', [location.state])

  if (!loading && user) {
    return <Navigate to={from} replace />
  }

  async function onSubmit(event) {
    event.preventDefault()
    setError('')

    if (!isEmailValid(form.email)) {
      setError('Please enter a valid email address.')
      return
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    try {
      setSubmitting(true)
      await signIn(form.email.trim(), form.password)
      navigate(from, { replace: true })
    } catch (authError) {
      setError(authError.message || 'Unable to sign in right now.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">Log in to Overwatch AI</h1>
      <p className="mt-2 text-sm text-slate-600">Continue to your personalized disaster preparedness dashboard.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            placeholder="At least 8 characters"
            autoComplete="current-password"
            required
          />
        </div>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Signing in...' : 'Log In'}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        No account yet?{' '}
        <Link className="font-medium text-blue-700 hover:text-blue-800" to="/signup">
          Create one
        </Link>
      </p>
    </div>
  )
}
```

- [ ] Create `src/components/auth/SignupPage.jsx`:

```jsx
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

function isEmailValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isPasswordStrong(password) {
  const hasLetter = /[A-Za-z]/.test(password)
  const hasNumber = /\d/.test(password)
  return password.length >= 8 && hasLetter && hasNumber
}

export default function SignupPage() {
  const navigate = useNavigate()
  const { user, loading, signUp } = useAuth()

  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  if (!loading && user) {
    return <Navigate to="/profile-setup" replace />
  }

  async function onSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!isEmailValid(form.email)) {
      setError('Please enter a valid email address.')
      return
    }

    if (!isPasswordStrong(form.password)) {
      setError('Password must be at least 8 characters and include letters and numbers.')
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    try {
      setSubmitting(true)
      const { user: createdUser, session } = await signUp(form.email.trim(), form.password)

      if (!session && createdUser) {
        setMessage('Account created. Check your email to confirm, then log in.')
        return
      }

      navigate('/profile-setup', { replace: true })
    } catch (authError) {
      setError(authError.message || 'Unable to create account right now.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
      <p className="mt-2 text-sm text-slate-600">Sign up to personalize preparedness plans for your household.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="signup-email">
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="signup-password">
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            placeholder="Minimum 8 chars, letters + numbers"
            autoComplete="new-password"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="signup-confirm-password">
            Confirm password
          </label>
          <input
            id="signup-confirm-password"
            type="password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={form.confirmPassword}
            onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
            placeholder="Re-enter your password"
            autoComplete="new-password"
            required
          />
        </div>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        {message ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        Already have an account?{' '}
        <Link className="font-medium text-blue-700 hover:text-blue-800" to="/login">
          Log in
        </Link>
      </p>
    </div>
  )
}
```

- [ ] Replace `src/App.jsx` with:

```jsx
import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './components/auth/LoginPage'
import SignupPage from './components/auth/SignupPage'
import Dashboard from './components/dashboard/Dashboard'
import LandingPage from './components/landing/LandingPage'
import Layout from './components/layout/Layout'
import LocationInput from './components/onboarding/LocationInput'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/setup" element={<LocationInput />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
```

##### Step 2 Verification Checklist
- [ ] Visit `/login` and `/signup` — both forms render
- [ ] Invalid input shows inline validation errors
- [ ] Successful signup creates user in Supabase Auth
- [ ] Successful login sets user in `AuthContext`

#### Step 2 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 3: Build Personal Information Form (Post-Auth Onboarding)
- [ ] Create `src/components/onboarding/PersonalInfoForm.jsx`:

```jsx
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'

const LOCAL_CONTACT_KEY = 'overwatch-contacts'

function toInt(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function emptyPet() {
  return { type: '', count: 0 }
}

function emptyContact() {
  return { name: '', phone: '', relationship: '' }
}

function sanitizePets(pets) {
  const cleaned = pets
    .map((pet) => ({ type: String(pet.type || '').trim(), count: toInt(pet.count) }))
    .filter((pet) => pet.type && pet.count > 0)
  return cleaned.length > 0 ? cleaned : [emptyPet()]
}

function sanitizeContacts(contacts) {
  const cleaned = contacts
    .map((contact) => ({
      name: String(contact.name || '').trim(),
      phone: String(contact.phone || '').trim(),
      relationship: String(contact.relationship || '').trim(),
    }))
    .filter((contact) => contact.name && contact.phone && contact.relationship)
  return cleaned.length > 0 ? cleaned : [emptyContact()]
}

export default function PersonalInfoForm({ isEdit = false }) {
  const navigate = useNavigate()
  const { location } = useAppContext()
  const { profile, saveProfile, refreshProfile } = useAuth()

  const initialContacts = useMemo(() => {
    if (Array.isArray(profile?.emergency_contacts) && profile.emergency_contacts.length > 0) {
      return profile.emergency_contacts
    }

    try {
      const raw = localStorage.getItem(LOCAL_CONTACT_KEY)
      if (!raw) return [emptyContact()]
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed) || parsed.length === 0) return [emptyContact()]
      return parsed
    } catch {
      return [emptyContact()]
    }
  }, [profile?.emergency_contacts])

  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [household, setHousehold] = useState({
    adults: toInt(profile?.household?.adults ?? 1),
    children: toInt(profile?.household?.children ?? 0),
    elderly: toInt(profile?.household?.elderly ?? 0),
  })
  const [medicalNotes, setMedicalNotes] = useState(profile?.medical_notes || '')
  const [pets, setPets] = useState(
    Array.isArray(profile?.pets) && profile.pets.length > 0 ? profile.pets : [emptyPet()],
  )
  const [vehicleType, setVehicleType] = useState(profile?.vehicle_type || 'none')
  const [workLocation, setWorkLocation] = useState(profile?.work_location || '')
  const [workHours, setWorkHours] = useState(profile?.work_hours || '')
  const [workDayOff, setWorkDayOff] = useState(profile?.work_day_off || '')
  const [contacts, setContacts] = useState(initialContacts)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function updateHousehold(field, value) {
    setHousehold((prev) => ({ ...prev, [field]: toInt(value) }))
  }

  function updatePet(index, field, value) {
    setPets((prev) =>
      prev.map((pet, currentIndex) =>
        currentIndex === index
          ? { ...pet, [field]: field === 'count' ? toInt(value) : value }
          : pet,
      ),
    )
  }

  function addPet() {
    setPets((prev) => [...prev, emptyPet()])
  }

  function removePet(index) {
    setPets((prev) => (prev.length <= 1 ? prev : prev.filter((_, currentIndex) => currentIndex !== index)))
  }

  function updateContact(index, field, value) {
    setContacts((prev) =>
      prev.map((contact, currentIndex) =>
        currentIndex === index ? { ...contact, [field]: value } : contact,
      ),
    )
  }

  function addContact() {
    setContacts((prev) => [...prev, emptyContact()])
  }

  function removeContact(index) {
    setContacts((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, currentIndex) => currentIndex !== index),
    )
  }

  async function onSubmit(event) {
    event.preventDefault()
    setError('')

    const payload = {
      full_name: fullName.trim(),
      household: {
        adults: toInt(household.adults),
        children: toInt(household.children),
        elderly: toInt(household.elderly),
      },
      medical_notes: medicalNotes.trim(),
      pets: sanitizePets(pets),
      vehicle_type: vehicleType,
      work_location: workLocation.trim(),
      work_hours: workHours.trim(),
      work_day_off: workDayOff.trim(),
      emergency_contacts: sanitizeContacts(contacts),
      location: profile?.location || (location ? { ...location } : null),
    }

    const householdTotal = payload.household.adults + payload.household.children + payload.household.elderly

    if (!payload.full_name) {
      setError('Full name is required.')
      return
    }
    if (householdTotal <= 0) {
      setError('Household size must be at least 1.')
      return
    }
    if (!payload.medical_notes) {
      setError('Medical conditions or mobility limitations are required.')
      return
    }
    if (!payload.work_location || !payload.work_hours || !payload.work_day_off) {
      setError('Complete all work information fields.')
      return
    }

    try {
      setSubmitting(true)
      await saveProfile(payload)
      await refreshProfile()
      localStorage.removeItem(LOCAL_CONTACT_KEY)

      if (isEdit) {
        navigate('/dashboard', { replace: true })
        return
      }

      navigate(location ? '/dashboard' : '/setup', { replace: true })
    } catch (saveError) {
      setError(saveError.message || 'Unable to save profile right now.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">
        {isEdit ? 'Edit your profile' : 'Complete your personal preparedness profile'}
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        This information personalizes your risk alerts, evacuation guidance, supplies list, and communication drafts.
      </p>

      <form className="mt-6 space-y-6" onSubmit={onSubmit}>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Basic info</h2>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Full name</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
          </label>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Household composition</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Adults', 'adults'],
              ['Children', 'children'],
              ['Elderly', 'elderly'],
            ].map(([label, key]) => (
              <label key={key} className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">{label}</span>
                <input
                  type="number"
                  min="0"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={household[key]}
                  onChange={(event) => updateHousehold(key, event.target.value)}
                  required
                />
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Medical and mobility notes</h2>
          <textarea
            className="min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="List chronic conditions, medications, mobility concerns, assistive devices, etc."
            value={medicalNotes}
            onChange={(event) => setMedicalNotes(event.target.value)}
            required
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Pets</h2>
          {pets.map((pet, index) => (
            <div key={`pet-${index}`} className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-3">
              <input
                className="rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Pet type (e.g., Dog)"
                value={pet.type}
                onChange={(event) => updatePet(index, 'type', event.target.value)}
              />
              <input
                type="number"
                min="0"
                className="rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Count"
                value={pet.count}
                onChange={(event) => updatePet(index, 'count', event.target.value)}
              />
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                onClick={() => removePet(index)}
              >
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white" onClick={addPet}>
            Add pet
          </button>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Vehicle availability</h2>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={vehicleType}
            onChange={(event) => setVehicleType(event.target.value)}
            required
          >
            <option value="none">No vehicle</option>
            <option value="motorcycle">Motorcycle</option>
            <option value="car">Car</option>
            <option value="van">Van</option>
            <option value="truck">Truck</option>
            <option value="other">Other</option>
          </select>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Work information</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              className="rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Work location"
              value={workLocation}
              onChange={(event) => setWorkLocation(event.target.value)}
              required
            />
            <input
              className="rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Work hours (e.g., 10PM-6AM)"
              value={workHours}
              onChange={(event) => setWorkHours(event.target.value)}
              required
            />
            <input
              className="rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Day off"
              value={workDayOff}
              onChange={(event) => setWorkDayOff(event.target.value)}
              required
            />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Emergency contacts</h2>
          {contacts.map((contact, index) => (
            <div key={`contact-${index}`} className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-4">
              <input
                className="rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Name"
                value={contact.name}
                onChange={(event) => updateContact(index, 'name', event.target.value)}
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Phone"
                value={contact.phone}
                onChange={(event) => updateContact(index, 'phone', event.target.value)}
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Relationship"
                value={contact.relationship}
                onChange={(event) => updateContact(index, 'relationship', event.target.value)}
              />
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                onClick={() => removeContact(index)}
              >
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white" onClick={addContact}>
            Add contact
          </button>
        </section>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Saving profile...' : isEdit ? 'Save profile updates' : 'Complete profile'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] Replace `src/App.jsx` with:

```jsx
import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './components/auth/LoginPage'
import SignupPage from './components/auth/SignupPage'
import Dashboard from './components/dashboard/Dashboard'
import LandingPage from './components/landing/LandingPage'
import Layout from './components/layout/Layout'
import LocationInput from './components/onboarding/LocationInput'
import PersonalInfoForm from './components/onboarding/PersonalInfoForm'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/profile-setup" element={<PersonalInfoForm />} />
        <Route path="/setup" element={<LocationInput />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
```

##### Step 3 Verification Checklist
- [ ] After signup/login with incomplete profile, user can open `/profile-setup`
- [ ] Submitting form creates/updates row in Supabase `profiles`
- [ ] After successful submit, user is redirected to `/setup` (if no location) or `/dashboard`

#### Step 3 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 4: Add Route Protection and Auth-Aware Navigation
- [ ] Create `src/components/auth/ProtectedRoute.jsx`:

```jsx
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import LoadingSpinner from '../common/LoadingSpinner'

export default function ProtectedRoute({ children, requireProfile = true }) {
  const location = useLocation()
  const { user, loading, profileComplete } = useAuth()

  if (loading) {
    return <LoadingSpinner label="Checking authentication..." />
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (requireProfile && !profileComplete && location.pathname !== '/profile-setup') {
    return <Navigate to="/profile-setup" replace />
  }

  return children
}
```

- [ ] Replace `src/App.jsx` with:

```jsx
import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './components/auth/LoginPage'
import ProtectedRoute from './components/auth/ProtectedRoute'
import SignupPage from './components/auth/SignupPage'
import Dashboard from './components/dashboard/Dashboard'
import LandingPage from './components/landing/LandingPage'
import Layout from './components/layout/Layout'
import LocationInput from './components/onboarding/LocationInput'
import PersonalInfoForm from './components/onboarding/PersonalInfoForm'
import { useAuth } from './context/AuthContext'

function PublicAuthRoute({ children }) {
  const { user, profileComplete, loading } = useAuth()

  if (loading) return children
  if (!user) return children

  return <Navigate to={profileComplete ? '/dashboard' : '/profile-setup'} replace />
}

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route
          path="/login"
          element={
            <PublicAuthRoute>
              <LoginPage />
            </PublicAuthRoute>
          }
        />

        <Route
          path="/signup"
          element={
            <PublicAuthRoute>
              <SignupPage />
            </PublicAuthRoute>
          }
        />

        <Route
          path="/profile-setup"
          element={
            <ProtectedRoute requireProfile={false}>
              <PersonalInfoForm />
            </ProtectedRoute>
          }
        />

        <Route
          path="/setup"
          element={
            <ProtectedRoute>
              <LocationInput />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
```

- [ ] Replace `src/components/layout/Header.jsx` with:

```jsx
import { ShieldAlert } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function Header() {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()

  async function onLogout() {
    try {
      await signOut()
      navigate('/', { replace: true })
    } catch (error) {
      console.error('[Auth] Logout failed:', error.message)
    }
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <ShieldAlert className="text-blue-700" size={20} />
          <p className="font-semibold text-slate-900">Overwatch AI</p>
        </Link>

        {user ? (
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-600">{profile?.full_name || user.email}</p>
            <button
              onClick={onLogout}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login" className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Login
            </Link>
            <Link to="/signup" className="rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800">
              Sign up
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
```

- [ ] Replace `src/components/landing/LandingPage.jsx` with:

```jsx
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function LandingPage() {
  const { user, profileComplete } = useAuth()

  const ctaTarget = user ? (profileComplete ? '/dashboard' : '/profile-setup') : '/signup'
  const ctaLabel = user ? 'Go to Dashboard' : 'Get Started'

  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-bold text-slate-900">
        Your AI-Powered Emergency Preparedness Companion for the Philippines
      </h1>
      <p className="mt-3 text-slate-600">
        Prepare for typhoons, earthquakes, floods, and volcanic activity with localized data and actionable plans.
      </p>
      <Link
        to={ctaTarget}
        className="mt-6 inline-flex rounded-lg bg-blue-700 px-5 py-3 font-medium text-white hover:bg-blue-800"
      >
        {ctaLabel}
      </Link>
    </div>
  )
}
```

##### Step 4 Verification Checklist
- [ ] Unauthenticated visit to `/dashboard` redirects to `/login`
- [ ] Authenticated but incomplete profile redirects to `/profile-setup`
- [ ] Authenticated + complete profile can access `/setup` and `/dashboard`
- [ ] Header shows logged-in user and logout works

#### Step 4 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 5: Integrate Personal Info into AI Agents and Remove Legacy Contacts Storage
- [ ] Replace `src/context/AppContext.jsx` with:

```jsx
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
```

- [ ] Replace `src/hooks/useAgents.js` with:

```javascript
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
```

- [ ] Replace `src/agents/orchestrator.js` with:

```javascript
import { runCommunicationDraft } from './communicationDraft'
import { runEvacuationRouting } from './evacuationRouting'
import { runRiskAssessment } from './riskAssessment'
import { runSuppliesPlanning } from './suppliesPlanning'

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
```

- [ ] Replace `src/agents/riskAssessment.js` with:

```javascript
import { getEonetEvents, getGdacsRss, getReliefwebReports, getUsgsEarthquakes } from '../api/disasters'
import { generateJson } from '../api/gemini'
import { getPagasaFlood, getPagasaWeather } from '../api/pagasa'
import { getPhivolcsEarthquakes, getPhivolcsVolcanoes } from '../api/phivolcs'
import { getWeatherForecast } from '../api/weather'
import { riskPrompt } from '../utils/prompts'

function normalizeProfile(profile) {
  if (!profile) return null
  return {
    fullName: profile.full_name || '',
    household: profile.household || {},
    medicalNotes: profile.medical_notes || '',
    pets: profile.pets || [],
    vehicleType: profile.vehicle_type || 'none',
    work: {
      location: profile.work_location || '',
      hours: profile.work_hours || '',
      dayOff: profile.work_day_off || '',
    },
    emergencyContacts: profile.emergency_contacts || [],
  }
}

export async function runRiskAssessment(location, profile) {
  const results = await Promise.allSettled([
    getWeatherForecast(location.lat, location.lon),
    getUsgsEarthquakes(),
    getEonetEvents(),
    getGdacsRss(),
    getReliefwebReports(),
    getPagasaWeather(),
    getPagasaFlood(),
    getPhivolcsEarthquakes(),
    getPhivolcsVolcanoes(),
  ])

  const resolve = (result, fallback = null) => (result.status === 'fulfilled' ? result.value : fallback)

  const [weather, usgs, eonet, gdacs, reliefweb, pagasaWeather, pagasaFlood, phEq, phVol] = results.map((result) => resolve(result))

  const labels = ['weather', 'usgs', 'eonet', 'gdacs', 'reliefweb', 'pagasaWeather', 'pagasaFlood', 'phivolcsEq', 'phivolcsVol']
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.warn(`[RiskAssessment] ${labels[index]} failed:`, result.reason?.message || result.reason)
    }
  })

  const trimEarthquakes = (data) => {
    if (!data) return null
    const features = data?.features || data
    return Array.isArray(features) ? features.slice(0, 10) : features
  }

  const input = {
    locationName: location.name,
    profile: normalizeProfile(profile),
    weather: weather
      ? {
          daily: weather.daily,
          timezone: weather.timezone,
        }
      : null,
    usgs: usgs ? trimEarthquakes(usgs) : null,
    eonet: eonet?.features?.slice(0, 10) || null,
    gdacs: gdacs ? String(gdacs).slice(0, 2000) : null,
    reliefweb: reliefweb?.data?.slice(0, 5) || null,
    pagasaWeather: pagasaWeather || null,
    pagasaFlood: pagasaFlood || null,
    phivolcsEarthquakes: phEq ? phEq.slice(0, 10) : null,
    phivolcsVolcanoes: phVol ? phVol.slice(0, 10) : null,
  }

  return generateJson(riskPrompt(input), 'risk assessment schema')
}
```

- [ ] Replace `src/agents/suppliesPlanning.js` with:

```javascript
import { generateJson } from '../api/gemini'
import { suppliesPrompt } from '../utils/prompts'

export async function runSuppliesPlanning(riskData, profile) {
  return generateJson(
    suppliesPrompt({
      riskData,
      profile: {
        fullName: profile?.full_name || '',
        household: profile?.household || {},
        pets: profile?.pets || [],
        medicalNotes: profile?.medical_notes || '',
      },
    }),
    'supplies checklist schema',
  )
}
```

- [ ] Replace `src/agents/evacuationRouting.js` with:

```javascript
import { findNearbyFacilities, getRoute } from '../api/geoapify'
import { generateJson } from '../api/gemini'
import { evacuationPrompt } from '../utils/prompts'

const CATEGORIES = ['healthcare.hospital', 'education.school', 'service.fire_station', 'service.police']

export async function runEvacuationRouting(location, riskData, profile) {
  const facilities = await findNearbyFacilities(location.lat, location.lon, CATEGORIES, 5000)

  const top = (facilities.features || []).slice(0, 5)
  const routes = await Promise.all(
    top.map(async (feature) => {
      const [lon, lat] = feature.geometry.coordinates
      const route = await getRoute(
        { lat: location.lat, lon: location.lon },
        { lat, lon },
        'drive',
      )
      return { feature, route }
    }),
  )

  const recommendations = await generateJson(
    evacuationPrompt({
      location,
      riskData,
      facilities: top,
      profile: {
        household: profile?.household || {},
        vehicleType: profile?.vehicle_type || 'none',
        medicalNotes: profile?.medical_notes || '',
        pets: profile?.pets || [],
      },
    }),
    'evacuation recommendations schema',
  )

  return { facilities: top, routes, recommendations }
}
```

- [ ] Replace `src/agents/communicationDraft.js` with:

```javascript
import { generateJson } from '../api/gemini'
import { commsPrompt } from '../utils/prompts'

export async function runCommunicationDraft(location, riskData, profile) {
  return generateJson(
    commsPrompt({
      location,
      riskData,
      profile: {
        fullName: profile?.full_name || '',
        emergencyContacts: profile?.emergency_contacts || [],
      },
    }),
    'communication drafts schema',
  )
}
```

- [ ] Replace `src/utils/prompts.js` with:

```javascript
function profileContext(profile) {
  if (!profile) return 'No profile data provided.'
  return JSON.stringify(profile)
}

export function riskPrompt(input) {
  return `Analyze disaster risk for ${input.locationName} in the Philippines.
Personal profile context: ${profileContext(input.profile)}.
Risk data: ${JSON.stringify(input)}.
Prioritize medical conditions, mobility constraints, household composition, and work exposure timing.
Return JSON: {"riskLevel":"low|moderate|high|extreme","activeThreats":[],"summary":""}`
}

export function suppliesPrompt(input) {
  return `Generate a Philippines-focused emergency supply checklist.
Risk context: ${JSON.stringify(input.riskData)}.
Personal profile context: ${profileContext(input.profile)}.
Scale quantities based on household composition, include pet supplies, and include medically necessary items.
Return JSON: {"categories":[{"name":"","items":[{"name":"","quantity":"","reason":""}]}]}`
}

export function evacuationPrompt(input) {
  return `Recommend evacuation priorities and routing.
Location and facilities: ${JSON.stringify({ location: input.location, facilities: input.facilities })}.
Risk context: ${JSON.stringify(input.riskData)}.
Personal profile context: ${profileContext(input.profile)}.
Account for vehicle availability and mobility limitations.
Return JSON: {"recommendations":[],"topFacilities":[]}`
}

export function commsPrompt(input) {
  const locationName = input.location?.name || 'the area'
  return `Generate bilingual Filipino/English emergency communication drafts for someone located in "${locationName}", Philippines.
Use the real location name "${locationName}" in every output.
Risk context: ${JSON.stringify(input.riskData)}.
Personal profile context: ${profileContext(input.profile)}.
Use the person's name and emergency contact context in tone and guidance.
Return JSON: {"sms":"","barangayNotice":"","socialPost":"","meetingPlan":""}`
}
```

- [ ] Replace `src/components/dashboard/Dashboard.jsx` with:

```jsx
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
```

- [ ] Replace `src/components/dashboard/CommsPanel.jsx` with:

```jsx
import Card from '../common/Card'

export default function CommsPanel({ comms, contacts = [] }) {
  function copyText(text) {
    navigator.clipboard.writeText(text || '')
  }

  const sms =
    comms?.sms ||
    'Nasa aming lugar ako. Ligtas ako. Pupunta ako sa pinakamalapit na evacuation center.'
  const barangayNotice =
    comms?.barangayNotice || 'Mag-uulat po ako ng kasalukuyang sitwasyon sa aming lugar.'
  const socialPost =
    comms?.socialPost ||
    'I am safe. Please monitor official advisories and keep emergency lines open.'
  const meetingPlan =
    comms?.meetingPlan ||
    'Primary meet-up point: barangay hall. Backup: nearest school.'

  const visibleContacts = Array.isArray(contacts)
    ? contacts.filter(
        (contact) =>
          contact?.name?.trim() && contact?.phone?.trim() && contact?.relationship?.trim(),
      )
    : []

  return (
    <Card title="Communication Drafting">
      <div className="space-y-4 text-sm">
        {[
          ['Emergency SMS', sms],
          ['Barangay Notification', barangayNotice],
          ['Social Safety Check-in', socialPost],
          ['Family Meeting Plan', meetingPlan],
        ].map(([title, text]) => (
          <div key={title} className="rounded border border-slate-200 p-3">
            <p className="font-semibold">{title}</p>
            <p className="mt-1 text-slate-700">{text}</p>
            <button
              onClick={() => copyText(text)}
              className="mt-2 rounded bg-slate-900 px-2 py-1 text-xs text-white"
            >
              Copy to Clipboard
            </button>
          </div>
        ))}

        <div className="rounded border border-slate-200 p-3">
          <p className="font-semibold">Emergency Contacts</p>
          {visibleContacts.length === 0 ? (
            <p className="mt-2 text-slate-600">No emergency contacts on profile yet.</p>
          ) : (
            visibleContacts.map((contact, index) => (
              <div key={`${contact.name}-${index}`} className="mt-2 grid gap-2 sm:grid-cols-3">
                <p className="rounded border border-slate-200 px-2 py-1">{contact.name}</p>
                <p className="rounded border border-slate-200 px-2 py-1">{contact.phone}</p>
                <p className="rounded border border-slate-200 px-2 py-1">{contact.relationship}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  )
}
```

##### Step 5 Verification Checklist
- [ ] Running agents with profile data changes outputs (household, pets, vehicle, work exposure)
- [ ] Supplies output includes pet and household scaling when applicable
- [ ] Evacuation recommendations account for no vehicle / mobility notes
- [ ] Comms panel shows emergency contacts from profile (not localStorage)

#### Step 5 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 6: Session Persistence, Location Persistence, and Profile Editing
- [ ] Replace `src/context/AuthContext.jsx` with this final version (adds profile error state and robust refresh path):

```jsx
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
```

- [ ] Replace `src/context/AppContext.jsx` with this final version (location persistence to profile):

```jsx
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
```

- [ ] Create `src/components/onboarding/EditProfilePage.jsx`:

```jsx
import PersonalInfoForm from './PersonalInfoForm'

export default function EditProfilePage() {
  return <PersonalInfoForm isEdit />
}
```

- [ ] Replace `src/components/layout/Header.jsx` with this final version (adds Edit Profile):

```jsx
import { ShieldAlert } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function Header() {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()

  async function onLogout() {
    try {
      await signOut()
      navigate('/', { replace: true })
    } catch (error) {
      console.error('[Auth] Logout failed:', error.message)
    }
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <ShieldAlert className="text-blue-700" size={20} />
          <p className="font-semibold text-slate-900">Overwatch AI</p>
        </Link>

        {user ? (
          <div className="flex items-center gap-2">
            <p className="hidden text-sm text-slate-600 sm:block">{profile?.full_name || user.email}</p>
            <Link
              to="/profile/edit"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Edit Profile
            </Link>
            <button
              onClick={onLogout}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login" className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Login
            </Link>
            <Link to="/signup" className="rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800">
              Sign up
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
```

- [ ] Replace `src/App.jsx` with this final version (adds edit route):

```jsx
import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './components/auth/LoginPage'
import ProtectedRoute from './components/auth/ProtectedRoute'
import SignupPage from './components/auth/SignupPage'
import Dashboard from './components/dashboard/Dashboard'
import LandingPage from './components/landing/LandingPage'
import Layout from './components/layout/Layout'
import EditProfilePage from './components/onboarding/EditProfilePage'
import LocationInput from './components/onboarding/LocationInput'
import PersonalInfoForm from './components/onboarding/PersonalInfoForm'
import { useAuth } from './context/AuthContext'

function PublicAuthRoute({ children }) {
  const { user, profileComplete, loading } = useAuth()

  if (loading) return children
  if (!user) return children

  return <Navigate to={profileComplete ? '/dashboard' : '/profile-setup'} replace />
}

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route
          path="/login"
          element={
            <PublicAuthRoute>
              <LoginPage />
            </PublicAuthRoute>
          }
        />

        <Route
          path="/signup"
          element={
            <PublicAuthRoute>
              <SignupPage />
            </PublicAuthRoute>
          }
        />

        <Route
          path="/profile-setup"
          element={
            <ProtectedRoute requireProfile={false}>
              <PersonalInfoForm />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile/edit"
          element={
            <ProtectedRoute>
              <EditProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/setup"
          element={
            <ProtectedRoute>
              <LocationInput />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
```

##### Step 6 Verification Checklist
- [ ] Log in, refresh page, and remain authenticated
- [ ] Set location, refresh, and location persists from Supabase profile
- [ ] Logout and log back in — profile and location remain intact
- [ ] Simulate offline/auth failures and verify user-friendly auth/profile errors appear
- [ ] `Edit Profile` route updates profile data successfully

#### Step 6 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

## Final End-to-End Validation
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] Signup → profile setup → setup location → dashboard works start-to-finish
- [ ] Login with existing complete profile goes directly to dashboard
- [ ] Login with incomplete profile redirects to profile setup
- [ ] Agent outputs are visibly personalized from profile context
