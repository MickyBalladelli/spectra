import { verifyToken } from './auth.js'

export function getUserIdFromRequest(request) {
  return request.user.id
}

export function getUserIdFromSocket(socket) {
  const token = socket.handshake.auth?.token
  const payload = token ? verifyToken(token) : null

  return payload?.id || null
}
