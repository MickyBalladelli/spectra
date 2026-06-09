import { getUserId } from '../userSession.js'
import { getAuthToken } from '../userSession.js'

// Use process.env for Jest compatibility, fall back to import.meta.env for Vite
const apiUrl =
  typeof process !== 'undefined' && process.env?.VITE_API_URL
    ? process.env.VITE_API_URL
    : (typeof window !== 'undefined' && window.importMetaEnv?.VITE_API_URL) || 'http://localhost:4000';

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
