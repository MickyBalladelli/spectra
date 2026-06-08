import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import { indexRoutes } from './routes/indexRoutes.js'
import { ingestionRoutes } from './routes/ingestionRoutes.js'
import { authRoutes } from './routes/authRoutes.js'
import { queryRoutes } from './routes/queryRoutes.js'

export function createApp() {
  const app = express()

  app.use(cors({ origin: env.frontendOrigins }))
  app.use(express.json({ limit: '2mb' }))

  app.get('/health', (request, response) => {
    response.json({ ok: true, service: 'spectra-backend' })
  })

  app.use('/api/indexes', indexRoutes)
  app.use('/api/auth', authRoutes)
  app.use('/api/ingestions', ingestionRoutes)
  app.use('/api/query', queryRoutes)

  app.use((error, request, response, next) => {
    const status = error.name === 'ZodError' ? 400 : 500
    response.status(status).json({
      error: status === 400 ? 'Invalid request' : 'Internal server error',
      details: error.errors || error.message
    })
  })

  return app
}
