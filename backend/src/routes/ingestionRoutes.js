import express from 'express'
import { z } from 'zod'
import { ingestDocument } from '../services/ingestionService.js'
import { getUserIdFromRequest } from '../http/userScope.js'
import { requireAuth } from '../http/auth.js'
import { deleteDocument } from '../db/documents.js'

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

ingestionRoutes.delete('/:documentId', requireAuth, async (request, response, next) => {
  try {
    const result = await deleteDocument({
      userId: getUserIdFromRequest(request),
      documentId: request.params.documentId
    })

    if (!result.success) {
      return response.status(404).json({ error: result.message })
    }

    // Notify other clients that the document was deleted
    request.io?.emit('documentDeleted', { userId: getUserIdFromRequest(request), documentId: request.params.documentId })

    return response.json(result)
  } catch (error) {
    next(error)
  }
})
