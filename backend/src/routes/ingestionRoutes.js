import express from 'express'
import { z } from 'zod'
import { ingestDocument } from '../services/ingestionService.js'
import { createIngestionJob, listIngestionJobs, updateIngestionJob } from '../db/ingestionJobs.js'
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
    const userRoom = `user:${userId}`
    const documentsTotal = Array.isArray(payload.documents) ? payload.documents.length : 1
    const title = Array.isArray(payload.documents)
      ? `${payload.documents.length} documents`
      : payload.title
    const job = await createIngestionJob({ userId, title, documentsTotal, payload })

    request.io?.to(userRoom).emit('ingestion:job', job)
    response.status(202).json({ job })

    setImmediate(() => {
      runIngestionJob({ io: request.io, userId, userRoom, job, payload }).catch(() => {})
    })
  } catch (error) {
    next(error)
  }
})

ingestionRoutes.get('/jobs', requireAuth, async (request, response, next) => {
  try {
    response.json(await listIngestionJobs({
      userId: getUserIdFromRequest(request),
      limit: Number(request.query.limit || 20)
    }))
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

async function emitJobUpdate({ io, userRoom, userId, jobId, patch }) {
  const job = await updateIngestionJob({ jobId, userId, patch })
  io?.to(userRoom).emit('ingestion:job', job)
  return job
}

async function runIngestionJob({ io, userId, userRoom, job, payload }) {
  try {
    await emitJobUpdate({
      io,
      userRoom,
      userId,
      jobId: job.id,
      patch: {
        status: 'running',
        stage: 'queued',
        percent: 1,
        message: 'Starting ingestion',
        startedAt: new Date()
      }
    })

    const result = await ingestDocument({ ...payload, userId }, async progress => {
      const documentsCompleted = progress.documentIndex === undefined
        ? progress.percent === 100 ? 1 : 0
        : progress.documentIndex + (progress.documentPercent === 100 ? 1 : 0)

      await emitJobUpdate({
        io,
        userRoom,
        userId,
        jobId: job.id,
        patch: {
          status: 'running',
          stage: progress.stage,
          percent: progress.percent,
          message: progress.message,
          documentsCompleted
        }
      })

      io?.to(userRoom).emit('ingestion:progress', {
        userId,
        jobId: job.id,
        ...progress
      })
    })

    await emitJobUpdate({
      io,
      userRoom,
      userId,
      jobId: job.id,
      patch: {
        status: 'completed',
        stage: 'completed',
        percent: 100,
        message: 'Ingestion complete',
        documentsCompleted: job.documentsTotal,
        result,
        completedAt: new Date()
      }
    })

    io?.to(userRoom).emit('ingestion:completed', { userId, jobId: job.id, ...result })
  } catch (error) {
    await emitJobUpdate({
      io,
      userRoom,
      userId,
      jobId: job.id,
      patch: {
        status: 'failed',
        stage: 'failed',
        percent: 0,
        message: 'Ingestion failed',
        error: error.message,
        completedAt: new Date()
      }
    })

    io?.to(userRoom).emit('ingestion:error', {
      userId,
      jobId: job.id,
      message: error.message
    })
  }
}
