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