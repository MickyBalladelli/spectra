import cors from 'cors'
import express from 'express'
import { env, isAllowedFrontendOrigin } from './config/env.js'
import logger from './utils/logger.js'
import { pool } from './db/pool.js'
import { indexRoutes } from './routes/indexRoutes.js'
import { ingestionRoutes } from './routes/ingestionRoutes.js'
import { authRoutes } from './routes/authRoutes.js'
import { queryRoutes } from './routes/queryRoutes.js'
import { collectionRoutes } from './routes/collectionRoutes.js'
import { observabilityRoutes } from './routes/observabilityRoutes.js'
import { recordErrorLog, recordRequestLog } from './services/observabilityService.js'

export function createApp(getIo = () => null) {
  const app = express()

  // Initialize logger
  logger.info('Starting Spectra backend application')

  app.use(cors({
    origin(origin, callback) {
      callback(null, isAllowedFrontendOrigin(origin))
    }
  }))
  app.use(express.json({ limit: '10mb' }))
  app.use((request, response, next) => {
    request.io = getIo()
    next()
  })
  app.use((request, response, next) => {
    const startedAt = Date.now()

    response.on('finish', () => {
      if (request.path === '/health') return

      recordRequestLog({
        method: request.method,
        path: request.originalUrl,
        status: response.statusCode,
        latencyMs: Date.now() - startedAt,
        userId: request.user?.id || null
      })
    })

    next()
  })

  app.get('/health', async (request, response) => {
    try {
      const healthChecks = []

      // Check database connection
      let dbOk = false
      let dbMessage = ''
      try {
        await pool.query('SELECT 1')
        dbOk = true
        dbMessage = 'Database connection OK'
      } catch (error) {
        dbOk = false
        dbMessage = `Database error: ${error.message}`
      }
      healthChecks.push({ name: 'database', ok: dbOk, message: dbMessage })

      // Check pgvector-backed embeddings
      let vectorOk = false
      let vectorMessage = ''
      let vectorStats = null
      try {
        const result = await pool.query('select count(*)::int as vectors from document_chunks where embedding is not null')
        vectorOk = true
        vectorMessage = 'pgvector embeddings ready'
        vectorStats = result.rows[0]
      } catch (error) {
        vectorOk = false
        vectorMessage = `Vector check error: ${error.message}`
      }
      healthChecks.push({ name: 'pgvector', ok: vectorOk, message: vectorMessage, stats: vectorStats })

      const allOk = healthChecks.every(check => check.ok)

      response.json({
        ok: allOk,
        service: 'spectra-backend',
        checks: healthChecks
      })
    } catch (error) {
      logger.error('Health check failed:', error)
      response.status(500).json({
        ok: false,
        service: 'spectra-backend',
        error: error.message
      })
    }
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
    recordErrorLog({
      source: 'frontend',
      message: error,
      detail: stack || componentStack,
      userId: request.user?.id || null
    })
    response.status(200).json({ success: true })
  })

  app.use('/api/indexes', indexRoutes)
  app.use('/api/auth', authRoutes)
  app.use('/api/ingestions', ingestionRoutes)
  app.use('/api/query', queryRoutes)
  app.use('/api/collections', collectionRoutes)
  app.use('/api/observability', observabilityRoutes)

  // Centralized error handling middleware
  app.use((error, request, response, next) => {
    const status = error.status || (error.name === 'ZodError' ? 400 : 500)

    logger.error('Request failed:', {
      status,
      method: request.method,
      path: request.path,
      errorName: error.name,
      errorMessage: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    })
    recordErrorLog({
      source: 'backend',
      message: error.message,
      detail: error.stack,
      method: request.method,
      path: request.originalUrl,
      status,
      userId: request.user?.id || null
    })

    response.status(status).json({
      error: status === 400 ? 'Invalid request' : 'Internal server error',
      details: error.errors || error.message
    })
  })

  return app
}
