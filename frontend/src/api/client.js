import { getUserId } from '../userSession.js'
import { getAuthToken } from '../userSession.js'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export async function apiGet(path) {
  const response = await fetch(`${apiUrl}${path}`, {
    headers: {
      'X-Spectra-User': getUserId(),
      ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {})
    }
  })

  if (!response.ok) {
    throw new Error(`GET ${path} failed`)
  }

  return response.json()
}

export async function apiPost(path, body) {
  const response = await fetch(`${apiUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Spectra-User': getUserId(),
      ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {})
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    throw new Error(`POST ${path} failed`)
  }

  return response.json()
}
