import { useEffect, useState } from 'react'
import Card from '../common/Card'

const KEY = 'overwatch-contacts'

export default function CommsPanel({ comms }) {
  const [contacts, setContacts] = useState(() => {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : [{ name: '', phone: '', relationship: '' }]
  })

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(contacts))
  }, [contacts])

  function updateContact(index, field, value) {
    setContacts((prev) =>
      prev.map((contact, i) => (i === index ? { ...contact, [field]: value } : contact)),
    )
  }

  function copyText(text) {
    navigator.clipboard.writeText(text || '')
  }

  const sms = comms?.sms || 'Nasa aming lugar ako. Ligtas ako. Pupunta ako sa pinakamalapit na evacuation center.'
  const barangayNotice = comms?.barangayNotice || 'Mag-uulat po ako ng kasalukuyang sitwasyon sa aming lugar.'
  const socialPost = comms?.socialPost || 'I am safe. Please monitor official advisories and keep emergency lines open.'
  const meetingPlan = comms?.meetingPlan || 'Primary meet-up point: barangay hall. Backup: nearest school.'

  return (
    <Card title="Communication Drafting">
      <div className="space-y-4 text-sm">
        {[['Emergency SMS', sms], ['Barangay Notification', barangayNotice], ['Social Safety Check-in', socialPost], ['Family Meeting Plan', meetingPlan]].map(
          ([title, text]) => (
            <div key={title} className="rounded border border-slate-200 p-3">
              <p className="font-semibold">{title}</p>
              <p className="mt-1 text-slate-700">{text}</p>
              <button onClick={() => copyText(text)} className="mt-2 rounded bg-slate-900 px-2 py-1 text-xs text-white">
                Copy to Clipboard
              </button>
            </div>
          ),
        )}

        <div className="rounded border border-slate-200 p-3">
          <p className="font-semibold">Emergency Contacts</p>
          {contacts.map((contact, index) => (
            <div key={index} className="mt-2 grid gap-2 sm:grid-cols-3">
              <input
                className="rounded border border-slate-300 px-2 py-1"
                placeholder="Name"
                value={contact.name}
                onChange={(e) => updateContact(index, 'name', e.target.value)}
              />
              <input
                className="rounded border border-slate-300 px-2 py-1"
                placeholder="Phone"
                value={contact.phone}
                onChange={(e) => updateContact(index, 'phone', e.target.value)}
              />
              <input
                className="rounded border border-slate-300 px-2 py-1"
                placeholder="Relationship"
                value={contact.relationship}
                onChange={(e) => updateContact(index, 'relationship', e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}