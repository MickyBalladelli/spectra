const storageKey = 'spectra.userId'
const tokenKey = 'spectra.authToken'

function createUserId() {
  if (crypto.randomUUID) return crypto.randomUUID()
  return `user-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function getUserId() {
  const existing = localStorage.getItem(storageKey)
  if (existing) return existing

  const userId = createUserId()
  localStorage.setItem(storageKey, userId)
  return userId
}

export function setUserId(id) {
  localStorage.setItem(storageKey, id)
}

export function setAuthToken(token) {
  localStorage.setItem(tokenKey, token)
}

export function getAuthToken() {
  return localStorage.getItem(tokenKey) || null
}

export function clearAuth() {
  localStorage.removeItem(tokenKey)
}
