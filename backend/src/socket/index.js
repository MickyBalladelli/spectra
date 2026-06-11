import { executeQuery } from '../services/queryService.js'
import { getUserIdFromSocket } from '../http/userScope.js'

export function registerSockets(io) {
  io.on('connection', socket => {
    const userId = getUserIdFromSocket(socket)
    if (!userId) {
      socket.emit('query:error', { message: 'Sign in to use realtime search' })
      socket.disconnect(true)
      return
    }

    socket.join(`user:${userId}`)

    socket.emit('cluster:heartbeat', {
      status: 'connected',
      socketId: socket.id,
      at: new Date().toISOString()
    })

    socket.on('ingestion:start', () => {
      socket.emit('ingestion:error', { message: 'Use POST /api/ingestions to enqueue ingestion jobs' })
    })

    socket.on('query:execute', async payload => {
      try {
        socket.emit('query:progress', { stage: 'embedding', percent: 30 })
        const result = await executeQuery({ ...payload, userId })
        socket.emit('query:results', result)
      } catch (error) {
        socket.emit('query:error', { message: error.message })
      }
    })

    socket.on('disconnect', reason => {
      socket.broadcast.emit('cluster:heartbeat', {
        status: 'disconnected',
        socketId: socket.id,
        reason,
        at: new Date().toISOString()
      })
    })
  })
}
