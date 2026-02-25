# Authentication & Personal Information Onboarding

**Branch:** `feat/auth-onboarding`
**Description:** Add login/signup flow with post-auth personal information form that feeds user data into the app's AI agents for personalized disaster preparedness.

## Goal
Introduce user authentication (signup/login) and a post-auth onboarding form that collects personal details (household size, medical needs, vehicle access, etc.). This data will persist across sessions and be utilized by the AI agents to provide personalized risk assessments, evacuation plans, supply lists, and communications.

## Current State
- **No auth infrastructure** — no auth library, no user model, no database, no route protection
- **No session persistence** — React context resets on page refresh; only `localStorage` stores checklist & emergency contacts
- **Backend is a stateless scraper** — Express server with no database, no user routes, no auth middleware
- **Deployment** — Vercel static SPA with no serverless functions configured

## Auth Provider

**Supabase Auth + Postgres** — Open-source, SQL database with row-level security, built-in auth with social login support, generous free tier. Provides both authentication and a `profiles` table for storing personal info.

## Personal Information Fields

Collected in the post-signup onboarding form and stored in the Supabase `profiles` table:

| Field | Used By | Priority |
|-------|---------|----------|
| Full name | Comms drafting, personalization | Required |
| Household size (adults / children / elderly) | Supplies planning, evacuation routing | Required |
| Medical conditions / mobility limitations | Risk assessment, evacuation routing | Required |
| Pets (type & count) | Supplies planning, evacuation routing | Required |
| Vehicle availability (type) | Evacuation routing | Required |
| Work information (location, hours, day off) | Risk assessment (exposure during work), evacuation timing | Required |
| Emergency contacts (name, phone, relationship) | Comms drafting (migrates existing localStorage data) | Required |

## Implementation Steps

### Step 1: Install Supabase & Set Up Auth Context
**Files:** `package.json`, `src/lib/supabase.js` (new), `src/context/AuthContext.jsx` (new), `src/main.jsx`
**What:** Install `@supabase/supabase-js`. Create a Supabase client instance in `src/lib/supabase.js` using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars. Create an `AuthContext` provider wrapping the app, exposing `user`, `profile`, `loading`, `signUp()`, `signIn()`, `signOut()`, and `profileComplete` state. Subscribe to `onAuthStateChange` for session persistence. Wire it into `main.jsx` above `AppProvider`. Create the `profiles` table in Supabase with RLS policies (SQL provided in plan).
**Testing:** App boots without errors. `useAuth()` hook returns `{ user: null, loading: false }` when not logged in.

### Step 2: Build Login & Signup Pages
**Files:** `src/components/auth/LoginPage.jsx` (new), `src/components/auth/SignupPage.jsx` (new), `src/App.jsx`
**What:** Create login and signup page components with email/password forms styled with Tailwind to match the existing navy/slate design system. Add `/login` and `/signup` routes. Include form validation (email format, password strength). Use `supabase.auth.signUp()` and `supabase.auth.signInWithPassword()`. Add navigation links between the two pages and from the landing page CTA.
**Testing:** Navigate to `/login` and `/signup`. Forms render, validate inputs, and show inline errors. Successful signup creates a user in Supabase Auth dashboard. Successful login sets the user in AuthContext.

### Step 3: Build Personal Information Form (Post-Auth Onboarding)
**Files:** `src/components/onboarding/PersonalInfoForm.jsx` (new), `src/App.jsx`
**What:** Create a multi-section form collecting: full name, household composition (adults/children/elderly counts), medical conditions/mobility limitations (textarea), pets (type + count repeater), vehicle availability (type dropdown), work information (location, hours, day off), and emergency contacts (name/phone/relationship repeater — migrating the existing localStorage pattern from CommsPanel). Add a `/profile-setup` route. After signup (or login with incomplete profile), redirect here. Save to the Supabase `profiles` table via `supabase.from('profiles').upsert()`. Mark profile as complete in AuthContext.
**Testing:** After signing up, user is redirected to `/profile-setup`. Filling out and submitting the form saves data to Supabase (verify in dashboard). User is then redirected to `/setup` (location input) or `/dashboard`.

### Step 4: Add Route Protection & Navigation Guards
**Files:** `src/components/auth/ProtectedRoute.jsx` (new), `src/App.jsx`, `src/components/layout/Header.jsx`, `src/components/landing/LandingPage.jsx`
**What:** Create a `ProtectedRoute` wrapper that checks auth state — redirects unauthenticated users to `/login`, and authenticated users without a complete profile to `/profile-setup`. Wrap `/setup`, `/dashboard`, and `/profile-setup` routes. Update the Header to show the user's name/avatar and a logout button when authenticated. Update LandingPage CTA to go to `/signup` or `/dashboard` based on auth state.
**Testing:** Unauthenticated user visiting `/dashboard` → redirected to `/login`. Authenticated user without profile → redirected to `/profile-setup`. Authenticated user with profile → can access all pages. Logout clears session and redirects to `/`.

### Step 5: Integrate Personal Info into AI Agents
**Files:** `src/context/AppContext.jsx`, `src/hooks/useAgents.js`, `src/agents/riskAssessment.js`, `src/agents/suppliesPlanning.js`, `src/agents/evacuationRouting.js`, `src/agents/communicationDraft.js`, `src/utils/prompts.js`
**What:** Fetch the user's profile from AuthContext (already loaded from Supabase on login). Inject personal data into each agent's prompt: risk assessment considers medical conditions and work location/hours, supplies planning scales for household size and pets, evacuation considers vehicle availability and mobility limitations, comms uses the user's name and emergency contacts. Remove the legacy `localStorage` emergency contacts from CommsPanel (now sourced from profile).
**Testing:** Run agents with a profile that has specific data (e.g., 2 children, pet dog, no vehicle, works night shift). Verify agent outputs reference and adapt to the personal info (e.g., supplies list includes pet food, evacuation suggests walking routes, risk assessment flags work-hour exposure).

### Step 6: Session Persistence & Edge Cases
**Files:** `src/context/AuthContext.jsx`, `src/context/AppContext.jsx`
**What:** Verify Supabase auth session persists across page refreshes (SDK stores tokens in localStorage automatically). Persist the user's selected location to the `profiles` table so it survives refresh (update AppContext to load from profile on mount). Handle edge cases: expired sessions (Supabase auto-refreshes tokens), network errors during auth, profile editing (add an "Edit Profile" page accessible from the header user menu).
**Testing:** Log in → refresh page → still logged in. Select location → refresh → location persists. Log out → log back in → all data intact. Go offline → graceful error messages.
