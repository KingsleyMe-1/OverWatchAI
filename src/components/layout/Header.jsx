import { ShieldAlert } from 'lucide-react'

export default function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <ShieldAlert className="text-blue-700" size={20} />
        <p className="font-semibold text-slate-900">Overwatch AI</p>
      </div>
    </header>
  )
}