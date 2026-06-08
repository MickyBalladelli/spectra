import express from 'express'
import { getClusterStats, listChunks } from '../db/documents.js'
import { getUserIdFromRequest } from '../http/userScope.js'

export const indexRoutes = express.Router()

indexRoutes.get('/stats', async (request, response, next) => {
  try {
    response.json(await getClusterStats({ userId: getUserIdFromRequest(request) }))
  } catch (error) {
    next(error)
  }
})

indexRoutes.get('/chunks', async (request, response, next) => {
  try {
    response.json(await listChunks({
      userId: getUserIdFromRequest(request),
      limit: Number(request.query.limit || 50)
    }))
  } catch (error) {
    next(error)
  }
})
