import express from 'express'
import { listQueryLatency } from '../db/documents.js'
import { requireAuth } from '../http/auth.js'
import { getUserIdFromRequest } from '../http/userScope.js'
import { exportObservabilityLogs, getObservabilityLogs, sanitizeObservabilityFilters } from '../services/observabilityService.js'

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

observabilityRoutes.get('/download', async (request, response, next) => {
  try {
    const userId = getUserIdFromRequest(request)
    const filters = sanitizeObservabilityFilters({
      viewerUserId: userId,
      query: request.query
    })
    const csv = await exportObservabilityLogs({
      userId,
      limit: Math.min(Number(request.query.limit || 1000), 5000),
      filters
    })

    response.setHeader('Content-Type', 'text/csv; charset=utf-8')
    response.setHeader('Content-Disposition', `attachment; filename="spectra-logs-${new Date().toISOString().slice(0, 10)}.csv"`)
    response.send(csv)
  } catch (error) {
    next(error)
  }
})
