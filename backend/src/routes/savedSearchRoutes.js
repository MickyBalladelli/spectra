import express from 'express'
import { z } from 'zod'
import { createSavedSearch, deleteSavedSearch, listSavedSearches } from '../db/savedSearches.js'
import { requireAuth } from '../http/auth.js'
import { getUserIdFromRequest } from '../http/userScope.js'

const savedSearchSchema = z.object({
  name: z.string().min(1).max(120),
  config: z.object({
    query: z.string().min(1),
    useFilter: z.boolean().optional(),
    filter: z.record(z.unknown()).optional(),
    collectionId: z.string().optional(),
    sourceType: z.string().optional(),
    documentId: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional()
  })
})

export const savedSearchRoutes = express.Router()

savedSearchRoutes.use(requireAuth)

savedSearchRoutes.get('/', async (request, response, next) => {
  try {
    response.json(await listSavedSearches({
      userId: getUserIdFromRequest(request)
    }))
  } catch (error) {
    next(error)
  }
})

savedSearchRoutes.post('/', async (request, response, next) => {
  try {
    const payload = savedSearchSchema.parse(request.body)
    response.status(201).json(await createSavedSearch({
      userId: getUserIdFromRequest(request),
      ...payload
    }))
  } catch (error) {
    next(error)
  }
})

savedSearchRoutes.delete('/:savedSearchId', async (request, response, next) => {
  try {
    const deleted = await deleteSavedSearch({
      userId: getUserIdFromRequest(request),
      savedSearchId: request.params.savedSearchId
    })

    if (!deleted) {
      return response.status(404).json({ error: 'Saved search not found' })
    }

    return response.json({ success: true })
  } catch (error) {
    next(error)
  }
})
