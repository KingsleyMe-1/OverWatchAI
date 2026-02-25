import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-bold text-slate-900">Your AI-Powered Emergency Preparedness Companion for the Philippines</h1>
      <p className="mt-3 text-slate-600">Prepare for typhoons, earthquakes, floods, and volcanic activity with localized data and actionable plans.</p>
      <Link
        to="/setup"
        className="mt-6 inline-flex rounded-lg bg-blue-700 px-5 py-3 font-medium text-white hover:bg-blue-800"
      >
        Get Started
      </Link>
    </div>
  )
}