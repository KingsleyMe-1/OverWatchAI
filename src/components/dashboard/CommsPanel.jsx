import Card from '../common/Card'

export default function CommsPanel({ comms, contacts = [] }) {
  function copyText(text) {
    navigator.clipboard.writeText(text || '')
  }

  const sms =
    comms?.sms ||
    'Nasa aming lugar ako. Ligtas ako. Pupunta ako sa pinakamalapit na evacuation center.'
  const barangayNotice =
    comms?.barangayNotice || 'Mag-uulat po ako ng kasalukuyang sitwasyon sa aming lugar.'
  const socialPost =
    comms?.socialPost ||
    'I am safe. Please monitor official advisories and keep emergency lines open.'
  const meetingPlan =
    comms?.meetingPlan ||
    'Primary meet-up point: barangay hall. Backup: nearest school.'

  const visibleContacts = Array.isArray(contacts)
    ? contacts.filter(
        (contact) =>
          contact?.name?.trim() && contact?.phone?.trim() && contact?.relationship?.trim(),
      )
    : []

  return (
    <Card title="Communication Drafting">
      <div className="space-y-4 text-sm">
        {[
          ['Emergency SMS', sms],
          ['Barangay Notification', barangayNotice],
          ['Social Safety Check-in', socialPost],
          ['Family Meeting Plan', meetingPlan],
        ].map(([title, text]) => (
          <div key={title} className="rounded border border-slate-200 p-3">
            <p className="font-semibold">{title}</p>
            <p className="mt-1 text-slate-700">{text}</p>
            <button onClick={() => copyText(text)} className="mt-2 rounded bg-slate-900 px-2 py-1 text-xs text-white">
              Copy to Clipboard
            </button>
          </div>
        ))}

        <div className="rounded border border-slate-200 p-3">
          <p className="font-semibold">Emergency Contacts</p>
          {visibleContacts.length > 0 ? (
            visibleContacts.map((contact, index) => (
              <div key={index} className="mt-2 text-sm">
                <span className="font-medium">{contact.name}</span> ({contact.relationship}):{' '}
                <span className="font-mono">{contact.phone}</span>
              </div>
            ))
          ) : (
            <p className="mt-2 text-slate-600">No emergency contacts configured.</p>
          )}
        </div>
      </div>
    </Card>
  )
}