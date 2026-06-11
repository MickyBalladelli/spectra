import { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import { getUserId } from '../userSession.js'

function getSocketUrl() {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL
  if (typeof window !== 'undefined' && window.importMetaEnv?.VITE_SOCKET_URL) return window.importMetaEnv.VITE_SOCKET_URL
  if (typeof process !== 'undefined' && process.env?.VITE_SOCKET_URL) return process.env.VITE_SOCKET_URL
  if (typeof window === 'undefined') return 'http://localhost:4000'

  return `${window.location.protocol}//${window.location.hostname}:4000`
}

export function useSpectraSocket() {
  const [status, setStatus] = useState('connecting')
  const [events, setEvents] = useState([])

  const socket = useMemo(() => io(getSocketUrl(), {
    autoConnect: false,
    auth: {
      userId: getUserId()
    },
    reconnectionAttempts: 10,
    reconnectionDelay: 800,
    transports: ['websocket'],
    timeout: 5000
  }), [])

  useEffect(() => {
    const pushEvent = event => {
      setEvents(current => [event, ...current].slice(0, 8))
    }

    socket.on('connect', () => {
      setStatus('connected')
      pushEvent({
        status: 'connected',
        message: `Socket ${socket.id}`
      })
    })

    socket.on('disconnect', () => setStatus('disconnected'))
    socket.on('connect_error', error => {
      setStatus('error')
      pushEvent({
        status: 'error',
        message: error.message
      })
    })

    socket.on('cluster:heartbeat', pushEvent)
    socket.on('ingestion:progress', pushEvent)
    socket.on('ingestion:completed', event => pushEvent({
      stage: 'completed',
      message: `${event.chunks?.length || 0} chunks indexed`,
      ...event
    }))
    socket.on('ingestion:error', event => pushEvent({
      status: 'error',
      message: event?.message || 'Ingestion failed'
    }))
    socket.on('query:progress', pushEvent)

    if (socket.connected) {
      setStatus('connected')
    } else {
      socket.connect()
    }

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('connect_error')
      socket.off('cluster:heartbeat')
      socket.off('ingestion:progress')
      socket.off('ingestion:completed')
      socket.off('ingestion:error')
      socket.off('query:progress')
      socket.disconnect()
    }
  }, [socket])

  return {
    socket,
    status,
    events
  }
}
