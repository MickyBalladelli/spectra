import express from 'express'
import { listQueryLatency } from '../db/documents.js'
import { requireAuth } from '../http/auth.js'
import { getUserIdFromRequest } from '../http/userScope.js'
import { getObservabilityLogs, sanitizeObservabilityFilters } from '../services/observabilityService.js'

export const observabilityRoutes = express.Router()

observabilityRoutes.use(requireAuth)

observabilityRoutes.get('/', async (request, response, next) => {
  try {
    const userId = getUserIdFromRequest(request)
    const limit = Math.min(Number(request.query.limit || 50), 100)
    const filters = sanitizeObservabilityFilters({
      viewerUserId: userId,
      query: request.query
    })

    response.json({
      ...await getObservabilityLogs({
        userId,
        limit,
        filters
      }),
      searchLatency: await listQueryLatency({
        userId,
        limit,
        filters
      })
    })
  } catch (error) {
    next(error)
  }
})
