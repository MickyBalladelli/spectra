import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import logger from './utils/logger.js'
import { indexRoutes } from './routes/indexRoutes.js'
import { ingestionRoutes } from './routes/ingestionRoutes.js'
import { authRoutes } from './routes/authRoutes.js'
import { queryRoutes } from './routes/queryRoutes.js'

export function createApp() {
  const app = express()

  // Initialize logger
  logger.info('Starting Spectra backend application')

  app.use(cors({ origin: env.frontendOrigins }))
  app.use(express.json({ limit: '2mb' }))

  app.get('/health', (request, response) => {
    response.json({ ok: true, service: 'spectra-backend' })
  })

  // Error reporting endpoint for frontend
  app.post('/api/errors', express.json(), (request, response) => {
    const { error, stack, componentStack } = request.body
    logger.error('Frontend error reported:', {
      error,
      stack,
      componentStack,
      userAgent: request.headers['user-agent'],
      timestamp: new Date().toISOString(),
    })
    response.status(200).json({ success: true })
  })

  app.use('/api/indexes', indexRoutes)
  app.use('/api/auth', authRoutes)
  app.use('/api/ingestions', ingestionRoutes)
  app.use('/api/query', queryRoutes)

  // Centralized error handling middleware
  app.use((error, request, response, next) => {
    const status = error.name === 'ZodError' ? 400 : 500

    logger.error('Request failed:', {
      status,
      method: request.method,
      path: request.path,
      errorName: error.name,
      errorMessage: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    })

    response.status(status).json({
      error: status === 400 ? 'Invalid request' : 'Internal server error',
      details: error.errors || error.message
    })
  })

  return app
}
