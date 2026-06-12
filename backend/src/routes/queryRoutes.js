import express from 'express'
import { z } from 'zod'
import { executeQuery } from '../services/queryService.js'
import { saveSearchFeedback } from '../db/searchFeedback.js'
import { getUserIdFromRequest } from '../http/userScope.js'
import { requireAuth } from '../http/auth.js'

const querySchema = z.object({
  query: z.string().min(1),
  filter: z.record(z.unknown()).optional(),
  searchFilters: z.object({
    sourceType: z.string().optional(),
    documentId: z.string().uuid().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional()
  }).optional(),
  collectionId: z.string().uuid().nullable().optional(),
  topK: z.number().int().min(1).max(25).optional()
})

const feedbackSchema = z.object({
  queryAuditId: z.coerce.number().int().positive(),
  chunkId: z.coerce.number().int().positive(),
  rating: z.enum(['good', 'bad'])
})

export const queryRoutes = express.Router()

queryRoutes.use(requireAuth)

queryRoutes.post('/', async (request, response, next) => {
  try {
    const payload = querySchema.parse(request.body)
    response.json(await executeQuery({ ...payload, userId: getUserIdFromRequest(request) }))
  } catch (error) {
    next(error)
  }
})

queryRoutes.post('/feedback', async (request, response, next) => {
  try {
    const payload = feedbackSchema.parse(request.body)
    response.json(await saveSearchFeedback({
      userId: getUserIdFromRequest(request),
      ...payload
    }))
  } catch (error) {
    next(error)
  }
})
