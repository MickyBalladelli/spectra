import { getUserId } from '../userSession.js'
import { getAuthToken } from '../userSession.js'

function getApiUrl() {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) return import.meta.env.VITE_API_URL
  if (typeof window !== 'undefined' && window.importMetaEnv?.VITE_API_URL) return window.importMetaEnv.VITE_API_URL
  if (typeof process !== 'undefined' && process.env?.VITE_API_URL) return process.env.VITE_API_URL
  if (typeof window !== 'undefined') return `${window.location.protocol}//${window.location.hostname}:4000`

  return 'http://localhost:4000'
}

const apiUrl = getApiUrl()

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
  let response

  try {
    response = await fetch(`${apiUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Spectra-User': getUserId(),
        ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {})
      },
      body: JSON.stringify(body)
    })
  } catch {
    throw new Error(`Cannot reach API at ${apiUrl}`)
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(errorBody.error || errorBody.details || `POST ${path} failed`)
  }

  return response.json()
}

export async function apiDelete(path) {
  const response = await fetch(`${apiUrl}${path}`, {
    method: 'DELETE',
    headers: {
      'X-Spectra-User': getUserId(),
      ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {})
    }
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `DELETE ${path} failed`)
  }

  return response.json()
}
