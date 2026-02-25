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
