const store = new Map()

export function getCached(key) {
  const value = store.get(key)
  if (!value) return null
  if (Date.now() > value.expiry) {
    store.delete(key)
    return null
  }
  return value.data
}

export function setCached(key, data, ttlMs = 15 * 60 * 1000) {
  store.set(key, { data, expiry: Date.now() + ttlMs })
}