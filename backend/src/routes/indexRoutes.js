import express from 'express'
import { deleteDocument, getClusterStats, getDocument, listChunks, listDocuments } from '../db/documents.js'
import { getUserIdFromRequest } from '../http/userScope.js'
import { requireAuth } from '../http/auth.js'
import { rebuildUserVectorIndex } from '../services/indexMaintenanceService.js'

export const indexRoutes = express.Router()

indexRoutes.use(requireAuth)

indexRoutes.get('/stats', async (request, response, next) => {
  try {
    response.json(await getClusterStats({ userId: getUserIdFromRequest(request) }))
  } catch (error) {
    next(error)
  }
})

indexRoutes.post('/rebuild', async (request, response, next) => {
  try {
    const userId = getUserIdFromRequest(request)
    const userRoom = `user:${userId}`

    response.status(202).json({ ok: true, message: 'Vector rebuild started' })

    setImmediate(() => {
      rebuildUserVectorIndex({
        userId,
        emitProgress: progress => {
          request.io?.to(userRoom).emit('index:rebuild:progress', {
            userId,
            ...progress
          })
        }
      })
        .then(result => {
          request.io?.to(userRoom).emit('index:rebuild:completed', {
            userId,
            ...result,
            message: 'Vector rebuild complete'
          })
        })
        .catch(error => {
          request.io?.to(userRoom).emit('index:rebuild:error', {
            userId,
            message: error.message
          })
        })
    })
  } catch (error) {
    next(error)
  }
})

indexRoutes.get('/chunks', async (request, response, next) => {
  try {
    const limit = Math.min(Number(request.query.limit || 200), 1000)

    response.json(await listChunks({
      userId: getUserIdFromRequest(request),
      limit
    }))
  } catch (error) {
    next(error)
  }
})

indexRoutes.get('/documents', async (request, response, next) => {
  try {
    response.json(await listDocuments({
      userId: getUserIdFromRequest(request),
      limit: Number(request.query.limit || 50)
    }))
  } catch (error) {
    next(error)
  }
})

indexRoutes.get('/documents/:documentId', async (request, response, next) => {
  try {
    const document = await getDocument({
      userId: getUserIdFromRequest(request),
      documentId: request.params.documentId
    })

    if (!document) {
      return response.status(404).json({ error: 'Document not found' })
    }

    return response.json(document)
  } catch (error) {
    next(error)
  }
})

indexRoutes.delete('/documents/:documentId', async (request, response, next) => {
  try {
    const userId = getUserIdFromRequest(request)
    const result = await deleteDocument({
      userId,
      documentId: request.params.documentId
    })

    if (!result.success) {
      return response.status(404).json({ error: result.message })
    }

    request.io?.to(`user:${userId}`).emit('documentDeleted', { userId, documentId: request.params.documentId })

    return response.json(result)
  } catch (error) {
    next(error)
  }
})
