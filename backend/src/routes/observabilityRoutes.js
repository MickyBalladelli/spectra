import express from 'express'
import { listQueryLatency } from '../db/documents.js'
import { requireAuth } from '../http/auth.js'
import { getUserIdFromRequest } from '../http/userScope.js'
import { getObservabilityLogs } from '../services/observabilityService.js'

export const observabilityRoutes = express.Router()

observabilityRoutes.use(requireAuth)

observabilityRoutes.get('/', async (request, response, next) => {
  try {
    const userId = getUserIdFromRequest(request)

    response.json({
      ...await getObservabilityLogs({
        userId,
        limit: Math.min(Number(request.query.limit || 50), 100)
      }),
      searchLatency: await listQueryLatency({
        userId,
        limit: Math.min(Number(request.query.limit || 50), 100)
      })
    })
  } catch (error) {
    next(error)
  }
})
