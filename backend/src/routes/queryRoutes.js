import express from 'express'
import { z } from 'zod'
import { executeQuery } from '../services/queryService.js'
import { getUserIdFromRequest } from '../http/userScope.js'

const querySchema = z.object({
  query: z.string().min(1),
  filter: z.record(z.unknown()).optional(),
  topK: z.number().int().min(1).max(25).optional()
})

export const queryRoutes = express.Router()

queryRoutes.post('/', async (request, response, next) => {
  try {
    const payload = querySchema.parse(request.body)
    response.json(await executeQuery({ ...payload, userId: getUserIdFromRequest(request) }))
  } catch (error) {
    next(error)
  }
})
