import { useEffect, useState } from 'react'
import Card from '../common/Card'

const KEY = 'overwatch-checklist'

export default function SuppliesPanel({ supplies }) {
  const [checks, setChecks] = useState(() => {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : {}
  })

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(checks))
  }, [checks])

  function toggle(itemKey) {
    setChecks((prev) => ({ ...prev, [itemKey]: !prev[itemKey] }))
  }

  function downloadChecklist() {
    const content = JSON.stringify(supplies, null, 2)
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'overwatch-supplies-checklist.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const categories = supplies?.categories || []

  return (
    <Card title="Supplies Planning">
      <button onClick={downloadChecklist} className="mb-3 rounded bg-slate-900 px-3 py-1.5 text-sm text-white">
        Download Checklist
      </button>
      {categories.length === 0 ? (
        <p className="text-sm text-slate-600">No supply checklist yet.</p>
      ) : (
        <div className="space-y-3">
          {categories.map((category, index) => (
            <div key={`${category.name}-${index}`}>
              <h4 className="font-semibold">{category.name}</h4>
              <ul className="mt-1 space-y-1 text-sm">
                {(category.items || []).map((item, itemIndex) => {
                  const itemKey = `${category.name}-${item.name}-${itemIndex}`
                  return (
                    <li key={itemKey} className="flex items-start gap-2">
                      <input type="checkbox" checked={Boolean(checks[itemKey])} onChange={() => toggle(itemKey)} />
                      <span>
                        {item.name} — {item.quantity} ({item.reason})
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}