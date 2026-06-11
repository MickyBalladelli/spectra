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
    const userId = getUserIdFromRequest(request)
    const userRoom = `user:${userId}`
    const result = await ingestDocument({ ...payload, userId }, progress => {
      request.io?.to(userRoom).emit('ingestion:progress', { userId, ...progress })
    })

    request.io?.to(userRoom).emit('ingestion:completed', { userId, ...result })
    response.status(result.duplicate ? 200 : 201).json(result)
  } catch (error) {
    const userId = getUserIdFromRequest(request)
    request.io?.to(`user:${userId}`).emit('ingestion:error', { userId, message: error.message })
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
    const userId = getUserIdFromRequest(request)
    request.io?.to(`user:${userId}`).emit('documentDeleted', { userId, documentId: request.params.documentId })

    return response.json(result)
  } catch (error) {
    next(error)
  }
})
