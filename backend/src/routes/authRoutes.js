import express from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { pool } from '../db/pool.js'
import { getNextRegisteredUserRole, getUserRole, listUsersWithRoles, roles, updateUserRole, userIsAdmin } from '../db/users.js'
import { generateToken, requireAdmin, requireAuth } from '../http/auth.js'

const authSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(8)
})

const roleSchema = z.object({
  role: z.enum(roles)
})

export const authRoutes = express.Router()

authRoutes.get('/me', requireAuth, async (req, res, next) => {
  try {
    const role = await getUserRole(req.user.id)

    res.json({
      userId: req.user.id,
      role,
      isAdmin: role === 'admin'
    })
  } catch (err) {
    next(err)
  }
})

authRoutes.get('/users', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    res.json(await listUsersWithRoles())
  } catch (err) {
    next(err)
  }
})

authRoutes.patch('/users/:username/role', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { role } = roleSchema.parse(req.body)
    const user = await updateUserRole({
      username: req.params.username,
      role
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    return res.json(user)
  } catch (err) {
    next(err)
  }
})

authRoutes.post('/register', async (req, res, next) => {
  try {
    const { username, password } = authSchema.parse(req.body)
    const hashed = await bcrypt.hash(password, 10)
    const role = await getNextRegisteredUserRole()

    const result = await pool.query(
      'insert into users (username, password_hash, role) values ($1, $2, $3) returning username, role',
      [username, hashed, role]
    )

    const token = generateToken({ id: result.rows[0].username, role: result.rows[0].role })
    res.status(201).json({ token, userId: result.rows[0].username, role: result.rows[0].role })
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username already taken' })
    }
    next(err)
  }
})

authRoutes.post('/login', async (req, res, next) => {
  try {
    const { username, password } = authSchema.parse(req.body)
    const result = await pool.query('select password_hash, role from users where username = $1', [username])

    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    const passwordHash = result.rows[0].password_hash
    const valid = await bcrypt.compare(password, passwordHash)

    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    const token = generateToken({ id: username, role: result.rows[0].role })
    res.json({ token, userId: username, role: result.rows[0].role })
  } catch (err) {
    next(err)
  }
})
