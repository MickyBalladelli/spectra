import express from 'express'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { cancelIngestionJob, createIngestionJob, getIngestionJob, listIngestionJobs, toPublicIngestionJob } from '../db/ingestionJobs.js'
import { getIngestionWorkerControl, setIngestionWorkerPaused } from '../db/ingestionWorkerControl.js'
import { getUserIdFromRequest } from '../http/userScope.js'
import { requireAdmin, requireAuth } from '../http/auth.js'
import { deleteDocument } from '../db/documents.js'
import { uploadedFilesToPayload } from '../services/uploadParser.js'

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

ingestionRoutes.post(
  '/files',
  requireAuth,
  express.raw({ type: 'multipart/form-data', limit: '50mb' }),
  async (request, response, next) => {
    try {
      const userId = getUserIdFromRequest(request)
      const uploadId = randomUUID()
      const payload = await uploadedFilesToPayload({
        request,
        uploadId,
        baseMetadata: { source: 'server-upload' }
      })
      const documentsTotal = payload.uploads.length
      const title = documentsTotal === 1 ? payload.uploads[0].originalName : `${documentsTotal} files`
      const job = await createIngestionJob({ userId, title, documentsTotal, payload })

      response.status(202).json({
        job: toPublicIngestionJob(job),
        uploaded: documentsTotal
      })
    } catch (error) {
      next(error)
    }
  }
)

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

ingestionRoutes.post('/jobs/:jobId/retry', requireAuth, async (request, response, next) => {
  try {
    const userId = getUserIdFromRequest(request)
    const fileIndex = Number(request.body.fileIndex)
    const sourceJob = await getIngestionJob({
      userId,
      jobId: request.params.jobId
    })

    if (!sourceJob) {
      return response.status(404).json({ error: 'Ingestion job not found' })
    }

    if (!Number.isInteger(fileIndex) || fileIndex < 0) {
      return response.status(400).json({ error: 'Invalid file index' })
    }

    let payload
    let title

    if (Array.isArray(sourceJob.payload.uploads)) {
      const upload = sourceJob.payload.uploads[fileIndex]
      if (!upload) return response.status(404).json({ error: 'File not found in job' })
      payload = {
        ...sourceJob.payload,
        uploads: [upload]
      }
      title = upload.originalName
    } else if (Array.isArray(sourceJob.payload.documents)) {
      const document = sourceJob.payload.documents[fileIndex]
      if (!document) return response.status(404).json({ error: 'Document not found in job' })
      payload = {
        ...sourceJob.payload,
        documents: [document]
      }
      title = document.title
    } else if (fileIndex === 0) {
      payload = sourceJob.payload
      title = sourceJob.title
    } else {
      return response.status(404).json({ error: 'File not found in job' })
    }

    const job = await createIngestionJob({
      userId,
      title: `Retry ${title}`,
      documentsTotal: 1,
      payload
    })

    return response.status(202).json({ job: toPublicIngestionJob(job) })
  } catch (error) {
    next(error)
  }
})

ingestionRoutes.post('/jobs/:jobId/cancel', requireAuth, async (request, response, next) => {
  try {
    const job = await cancelIngestionJob({
      userId: getUserIdFromRequest(request),
      jobId: request.params.jobId
    })

    if (!job) {
      return response.status(404).json({ error: 'Ingestion job not found' })
    }

    return response.json({ job: toPublicIngestionJob(job) })
  } catch (error) {
    next(error)
  }
})

ingestionRoutes.get('/worker', requireAuth, requireAdmin, async (request, response, next) => {
  try {
    response.json(await getIngestionWorkerControl())
  } catch (error) {
    next(error)
  }
})

ingestionRoutes.post('/worker/pause', requireAuth, requireAdmin, async (request, response, next) => {
  try {
    response.json(await setIngestionWorkerPaused({
      paused: true,
      updatedBy: getUserIdFromRequest(request)
    }))
  } catch (error) {
    next(error)
  }
})

ingestionRoutes.post('/worker/resume', requireAuth, requireAdmin, async (request, response, next) => {
  try {
    response.json(await setIngestionWorkerPaused({
      paused: false,
      updatedBy: getUserIdFromRequest(request)
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
