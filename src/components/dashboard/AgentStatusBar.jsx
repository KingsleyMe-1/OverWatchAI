const AGENTS = [
  ['risk', 'Risk Assessment'],
  ['supplies', 'Supplies Planning'],
  ['evacuation', 'Evacuation Routing'],
  ['comms', 'Communication Drafting'],
]

function color(status) {
  if (status === 'running') return 'bg-amber-100 text-amber-700'
  if (status === 'complete') return 'bg-emerald-100 text-emerald-700'
  if (status === 'error') return 'bg-rose-100 text-rose-700'
  return 'bg-slate-100 text-slate-600'
}

export default function AgentStatusBar({ state }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {AGENTS.map(([key, label]) => (
        <div key={key} className={`rounded-lg px-3 py-2 text-sm font-medium ${color(state[key].status)}`} title={state[key].error || ''}>
          {label}: {state[key].status}
          {state[key].error && (
            <p className="mt-1 text-xs font-normal opacity-80 truncate">{state[key].error}</p>
          )}
        </div>
      ))}
    </div>
  )
}