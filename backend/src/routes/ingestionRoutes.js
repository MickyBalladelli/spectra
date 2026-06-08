import express from 'express'
import { z } from 'zod'
import { ingestDocument } from '../services/ingestionService.js'
import { getUserIdFromRequest } from '../http/userScope.js'
import { requireAuth } from '../http/auth.js'

const ingestSchema = z.object({
  title: z.string().min(1),
  sourceType: z.string().optional(),
  text: z.string().min(1),
  metadata: z.record(z.unknown()).optional()
})

export const ingestionRoutes = express.Router()

ingestionRoutes.post('/', requireAuth, async (request, response, next) => {
  try {
    const payload = ingestSchema.parse(request.body)
    const result = await ingestDocument({ ...payload, userId: getUserIdFromRequest(request) })
    response.status(result.duplicate ? 200 : 201).json(result)
  } catch (error) {
    next(error)
  }
})
