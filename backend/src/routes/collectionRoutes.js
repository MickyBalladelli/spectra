import express from 'express'
import { z } from 'zod'
import { requireAuth } from '../http/auth.js'
import { getUserIdFromRequest } from '../http/userScope.js'
import {
  addDocumentToCollection,
  createCollection,
  listCollectionDocuments,
  listCollections,
  removeDocumentFromCollection,
  shareCollection
} from '../db/collections.js'

const collectionSchema = z.object({
  name: z.string().trim().min(1).max(120)
})

const documentSchema = z.object({
  documentId: z.string().uuid()
})

const shareSchema = z.object({
  username: z.string().trim().min(1)
})

export const collectionRoutes = express.Router()

collectionRoutes.use(requireAuth)

collectionRoutes.get('/', async (request, response, next) => {
  try {
    response.json(await listCollections({ userId: getUserIdFromRequest(request) }))
  } catch (error) {
    next(error)
  }
})

collectionRoutes.post('/', async (request, response, next) => {
  try {
    const payload = collectionSchema.parse(request.body)
    response.status(201).json(await createCollection({
      userId: getUserIdFromRequest(request),
      name: payload.name
    }))
  } catch (error) {
    next(error)
  }
})

collectionRoutes.get('/:collectionId/documents', async (request, response, next) => {
  try {
    response.json(await listCollectionDocuments({
      userId: getUserIdFromRequest(request),
      collectionId: request.params.collectionId
    }))
  } catch (error) {
    next(error)
  }
})

collectionRoutes.post('/:collectionId/documents', async (request, response, next) => {
  try {
    const payload = documentSchema.parse(request.body)
    const added = await addDocumentToCollection({
      userId: getUserIdFromRequest(request),
      collectionId: request.params.collectionId,
      documentId: payload.documentId
    })

    if (!added) return response.status(404).json({ error: 'Collection or document not found' })
    return response.status(201).json(added)
  } catch (error) {
    next(error)
  }
})

collectionRoutes.delete('/:collectionId/documents/:documentId', async (request, response, next) => {
  try {
    const removed = await removeDocumentFromCollection({
      userId: getUserIdFromRequest(request),
      collectionId: request.params.collectionId,
      documentId: request.params.documentId
    })

    if (!removed) return response.status(404).json({ error: 'Collection document not found' })
    return response.json(removed)
  } catch (error) {
    next(error)
  }
})

collectionRoutes.post('/:collectionId/shares', async (request, response, next) => {
  try {
    const payload = shareSchema.parse(request.body)
    const shared = await shareCollection({
      userId: getUserIdFromRequest(request),
      collectionId: request.params.collectionId,
      targetUserId: payload.username
    })

    if (!shared) return response.status(404).json({ error: 'Collection or user not found' })
    return response.status(201).json(shared)
  } catch (error) {
    next(error)
  }
})
