import cors from 'cors'
import express from 'express'
import { env, isAllowedFrontendOrigin } from './config/env.js'
import logger from './utils/logger.js'
import { pool } from './db/pool.js'
import { indexRoutes } from './routes/indexRoutes.js'
import { ingestionRoutes } from './routes/ingestionRoutes.js'
import { authRoutes } from './routes/authRoutes.js'
import { queryRoutes } from './routes/queryRoutes.js'

export function createApp(getIo = () => null) {
  const app = express()

  // Initialize logger
  logger.info('Starting Spectra backend application')

  app.use(cors({
    origin(origin, callback) {
      callback(null, isAllowedFrontendOrigin(origin))
    }
  }))
  app.use(express.json({ limit: '100mb' }))
  app.use((request, response, next) => {
    request.io = getIo()
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

      // Check worker process (basic check - file existence)
      let workerOk = false
      let workerMessage = ''
      const fs = await import('fs')
      try {
        if (fs.existsSync('./workers/turbovec_worker.py')) {
          workerOk = true
          workerMessage = 'Worker script exists'
        } else {
          workerOk = false
          workerMessage = 'Worker script not found'
        }
      } catch (error) {
        workerOk = false
        workerMessage = `Worker check error: ${error.message}`
      }
      healthChecks.push({ name: 'worker', ok: workerOk, message: workerMessage })

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
