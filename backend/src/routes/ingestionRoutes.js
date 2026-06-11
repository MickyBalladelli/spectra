import express from 'express'
import { z } from 'zod'
import { createIngestionJob, listIngestionJobs, toPublicIngestionJob } from '../db/ingestionJobs.js'
import { getUserIdFromRequest } from '../http/userScope.js'
import { requireAuth } from '../http/auth.js'
import { deleteDocument } from '../db/documents.js'

const documentSchema = z.object({
  title: z.string().min(1),
  sourceType: z.string().optional(),
  text: z.string().min(1),
  metadata: z.record(z.unknown()).optional()
})

const ingestSchema = z.union([
  documentSchema,
  z.object({
    documents: z.array(documentSchema).min(1),
    metadata: z.record(z.unknown()).optional()
  })
])

export const ingestionRoutes = express.Router()

ingestionRoutes.post('/', requireAuth, async (request, response, next) => {
  try {
    const payload = ingestSchema.parse(request.body)
    const userId = getUserIdFromRequest(request)
    const documentsTotal = Array.isArray(payload.documents) ? payload.documents.length : 1
    const title = Array.isArray(payload.documents)
      ? `${payload.documents.length} documents`
      : payload.title
    const job = await createIngestionJob({ userId, title, documentsTotal, payload })

    response.status(202).json({ job: toPublicIngestionJob(job) })
  } catch (error) {
    next(error)
  }
})

ingestionRoutes.get('/jobs', requireAuth, async (request, response, next) => {
  try {
    const jobs = await listIngestionJobs({
      userId: getUserIdFromRequest(request),
      limit: Number(request.query.limit || 20)
    })

    response.json(jobs.map(toPublicIngestionJob))
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
    const userId = getUserIdFromRequest(request)
    request.io?.to(`user:${userId}`).emit('documentDeleted', { userId, documentId: request.params.documentId })

    return response.json(result)
  } catch (error) {
    next(error)
  }
})
