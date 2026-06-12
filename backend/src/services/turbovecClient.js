import { env } from '../config/env.js'
import logger from '../utils/logger.js'

const enabledBackends = new Set(['turbovec', 'hybrid'])

export function isTurbovecEnabled() {
  return enabledBackends.has(env.vectorSearchBackend)
}

async function requestTurbovec(path, payload) {
  if (!isTurbovecEnabled()) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), env.turbovecTimeoutMs)

  try {
    const response = await fetch(`${env.turbovecUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    })

    if (!response.ok) {
      throw new Error(`Turbovec ${path} failed with ${response.status}`)
    }

    return response.json()
  } catch (error) {
    logger.warn('Turbovec request failed', {
      path,
      message: error.message
    })
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export async function upsertChunkVectors(items) {
  if (!Array.isArray(items) || items.length === 0) return false

  const result = await requestTurbovec('/upsert', { items })
  return Boolean(result?.ok)
}

export async function removeChunkVectors(ids) {
  const cleanIds = (ids || [])
    .map(id => Number(id))
    .filter(id => Number.isSafeInteger(id) && id > 0)

  if (cleanIds.length === 0) return false

  const result = await requestTurbovec('/remove', { ids: cleanIds })
  return Boolean(result?.ok)
}

export async function searchChunkVectors({ vector, limit }) {
  const result = await requestTurbovec('/search', {
    vector,
    k: limit
  })

  if (!Array.isArray(result?.results)) return null
  return result.results
}
