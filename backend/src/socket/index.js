import { ingestDocument } from '../services/ingestionService.js'
import { executeQuery } from '../services/queryService.js'
import { getUserIdFromSocket } from '../http/userScope.js'

export function registerSockets(io) {
  io.on('connection', socket => {
    const userId = getUserIdFromSocket(socket)

    socket.emit('cluster:heartbeat', {
      status: 'connected',
      socketId: socket.id,
      at: new Date().toISOString()
    })

    socket.on('ingestion:start', async payload => {
      try {
        const result = await ingestDocument({ ...payload, userId }, progress => {
          socket.emit('ingestion:progress', progress)
        })

        socket.emit('ingestion:completed', result)
      } catch (error) {
        socket.emit('ingestion:error', { message: error.message })
      }
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
