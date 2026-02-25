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
