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
            <span className="text-sm text-slate-600">
              Hello, {profile?.full_name || user.email}
            </span>
            <button
              onClick={onLogout}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Login
            </Link>
            <Link to="/signup" className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800">
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}