import { randomUUID } from 'crypto'

export function getUserIdFromRequest(request) {
  return request.user?.id || request.get('X-Spectra-User') || request.body?.userId || randomUUID()
}

export function getUserIdFromSocket(socket) {
  return socket.handshake.auth?.userId || randomUUID()
}
