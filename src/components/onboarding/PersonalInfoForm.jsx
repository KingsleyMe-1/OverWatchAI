import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'

const LOCAL_CONTACT_KEY = 'overwatch-contacts'

function toInt(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function emptyPet() {
  return { type: '', count: 0 }
}

function emptyContact() {
  return { name: '', phone: '', relationship: '' }
}

function sanitizePets(pets) {
  const cleaned = pets
    .map((pet) => ({ type: String(pet.type || '').trim(), count: toInt(pet.count) }))
    .filter((pet) => pet.type && pet.count > 0)
  return cleaned.length > 0 ? cleaned : [emptyPet()]
}

function sanitizeContacts(contacts) {
  const cleaned = contacts
    .map((contact) => ({
      name: String(contact.name || '').trim(),
      phone: String(contact.phone || '').trim(),
      relationship: String(contact.relationship || '').trim(),
    }))
    .filter((contact) => contact.name && contact.phone && contact.relationship)
  return cleaned.length > 0 ? cleaned : [emptyContact()]
}

export default function PersonalInfoForm({ isEdit = false }) {
  const navigate = useNavigate()
  const { location } = useAppContext()
  const { profile, saveProfile, refreshProfile } = useAuth()

  const initialContacts = useMemo(() => {
    if (Array.isArray(profile?.emergency_contacts) && profile.emergency_contacts.length > 0) {
      return profile.emergency_contacts
    }

    try {
      const raw = localStorage.getItem(LOCAL_CONTACT_KEY)
      if (!raw) return [emptyContact()]
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed) || parsed.length === 0) return [emptyContact()]
      return parsed
    } catch {
      return [emptyContact()]
    }
  }, [profile?.emergency_contacts])

  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [household, setHousehold] = useState({
    adults: toInt(profile?.household?.adults ?? 1),
    children: toInt(profile?.household?.children ?? 0),
    elderly: toInt(profile?.household?.elderly ?? 0),
  })
  const [medicalNotes, setMedicalNotes] = useState(profile?.medical_notes || '')
  const [pets, setPets] = useState(
    Array.isArray(profile?.pets) && profile.pets.length > 0 ? profile.pets : [emptyPet()],
  )
  const [vehicleType, setVehicleType] = useState(profile?.vehicle_type || 'none')
  const [workLocation, setWorkLocation] = useState(profile?.work_location || '')
  const [workHours, setWorkHours] = useState(profile?.work_hours || '')
  const [workDayOff, setWorkDayOff] = useState(profile?.work_day_off || '')
  const [contacts, setContacts] = useState(initialContacts)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function updateHousehold(field, value) {
    setHousehold((prev) => ({ ...prev, [field]: toInt(value) }))
  }

  function updatePet(index, field, value) {
    setPets((prev) =>
      prev.map((pet, currentIndex) =>
        currentIndex === index
          ? { ...pet, [field]: field === 'count' ? toInt(value) : value }
          : pet,
      ),
    )
  }

  function addPet() {
    setPets((prev) => [...prev, emptyPet()])
  }

  function removePet(index) {
    setPets((prev) => (prev.length <= 1 ? prev : prev.filter((_, currentIndex) => currentIndex !== index)))
  }

  function updateContact(index, field, value) {
    setContacts((prev) =>
      prev.map((contact, currentIndex) =>
        currentIndex === index ? { ...contact, [field]: value } : contact,
      ),
    )
  }

  function addContact() {
    setContacts((prev) => [...prev, emptyContact()])
  }

  function removeContact(index) {
    setContacts((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, currentIndex) => currentIndex !== index),
    )
  }

  async function onSubmit(event) {
    event.preventDefault()
    setError('')

    const payload = {
      full_name: fullName.trim(),
      household: {
        adults: toInt(household.adults),
        children: toInt(household.children),
        elderly: toInt(household.elderly),
      },
      medical_notes: medicalNotes.trim(),
      pets: sanitizePets(pets),
      vehicle_type: vehicleType,
      work_location: workLocation.trim(),
      work_hours: workHours.trim(),
      work_day_off: workDayOff.trim(),
      emergency_contacts: sanitizeContacts(contacts),
      location: profile?.location || (location ? { ...location } : null),
    }

    const householdTotal = payload.household.adults + payload.household.children + payload.household.elderly

    if (!payload.full_name) {
      setError('Full name is required.')
      return
    }
    if (householdTotal <= 0) {
      setError('Household size must be at least 1.')
      return
    }
    if (!payload.medical_notes) {
      setError('Medical conditions or mobility limitations are required.')
      return
    }
    if (!payload.work_location || !payload.work_hours || !payload.work_day_off) {
      setError('Complete all work information fields.')
      return
    }

    try {
      setSubmitting(true)
      await saveProfile(payload)
      await refreshProfile()
      localStorage.removeItem(LOCAL_CONTACT_KEY)

      if (isEdit) {
        navigate('/dashboard', { replace: true })
        return
      }

      navigate(location ? '/dashboard' : '/setup', { replace: true })
    } catch (saveError) {
      setError(saveError.message || 'Unable to save profile right now.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">
        {isEdit ? 'Edit your profile' : 'Complete your personal preparedness profile'}
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        This information personalizes your risk alerts, evacuation guidance, supplies list, and communication drafts.
      </p>

      <form className="mt-6 space-y-6" onSubmit={onSubmit}>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Basic info</h2>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Full name</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
          </label>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Household composition</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Adults', 'adults'],
              ['Children', 'children'],
              ['Elderly', 'elderly'],
            ].map(([label, key]) => (
              <label key={key} className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">{label}</span>
                <input
                  type="number"
                  min="0"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={household[key]}
                  onChange={(event) => updateHousehold(key, event.target.value)}
                  required
                />
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Medical and mobility notes</h2>
          <textarea
            className="min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="List chronic conditions, medications, mobility concerns, assistive devices, etc."
            value={medicalNotes}
            onChange={(event) => setMedicalNotes(event.target.value)}
            required
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Pets</h2>
          {pets.map((pet, index) => (
            <div key={`pet-${index}`} className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-3">
              <input
                className="rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Pet type (e.g., Dog)"
                value={pet.type}
                onChange={(event) => updatePet(index, 'type', event.target.value)}
              />
              <input
                type="number"
                min="0"
                className="rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Count"
                value={pet.count}
                onChange={(event) => updatePet(index, 'count', event.target.value)}
              />
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                onClick={() => removePet(index)}
              >
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white" onClick={addPet}>
            Add pet
          </button>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Vehicle availability</h2>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={vehicleType}
            onChange={(event) => setVehicleType(event.target.value)}
            required
          >
            <option value="none">No vehicle</option>
            <option value="motorcycle">Motorcycle</option>
            <option value="car">Car</option>
            <option value="van">Van</option>
            <option value="truck">Truck</option>
            <option value="other">Other</option>
          </select>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Work information</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              className="rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Work location"
              value={workLocation}
              onChange={(event) => setWorkLocation(event.target.value)}
              required
            />
            <input
              className="rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Work hours (e.g., 10PM-6AM)"
              value={workHours}
              onChange={(event) => setWorkHours(event.target.value)}
              required
            />
            <input
              className="rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Day off"
              value={workDayOff}
              onChange={(event) => setWorkDayOff(event.target.value)}
              required
            />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Emergency contacts</h2>
          {contacts.map((contact, index) => (
            <div key={`contact-${index}`} className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-4">
              <input
                className="rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Name"
                value={contact.name}
                onChange={(event) => updateContact(index, 'name', event.target.value)}
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Phone"
                value={contact.phone}
                onChange={(event) => updateContact(index, 'phone', event.target.value)}
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Relationship"
                value={contact.relationship}
                onChange={(event) => updateContact(index, 'relationship', event.target.value)}
              />
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                onClick={() => removeContact(index)}
              >
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white" onClick={addContact}>
            Add contact
          </button>
        </section>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Saving profile...' : isEdit ? 'Save profile updates' : 'Complete profile'}
        </button>
      </form>
    </div>
  )
}
