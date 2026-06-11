import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { userIsAdmin } from '../db/users.js'

export function generateToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn })
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, env.jwtSecret)
  } catch (err) {
    return null
  }
}

export function requireAuth(req, res, next) {
  const auth = req.get('Authorization') || req.get('authorization')
  if (!auth) return res.status(401).json({ error: 'Unauthorized' })

  const parts = auth.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Unauthorized' })

  const payload = verifyToken(parts[1])
  if (!payload) return res.status(401).json({ error: 'Unauthorized' })

  req.user = payload
  next()
}

export async function requireAdmin(req, res, next) {
  try {
    if (!req.user?.id || !(await userIsAdmin(req.user.id))) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    return next()
  } catch (error) {
    return next(error)
  }
}
