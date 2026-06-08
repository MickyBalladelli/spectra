import express from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { pool } from '../db/pool.js'
import { generateToken } from '../http/auth.js'

const authSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(8)
})

export const authRoutes = express.Router()

authRoutes.post('/register', async (req, res, next) => {
  try {
    const { username, password } = authSchema.parse(req.body)
    const hashed = await bcrypt.hash(password, 10)

    const result = await pool.query(
      'insert into users (username, password_hash) values ($1, $2) returning username',
      [username, hashed]
    )

    const token = generateToken({ id: result.rows[0].username })
    res.status(201).json({ token, userId: result.rows[0].username })
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
    const result = await pool.query('select password_hash from users where username = $1', [username])

    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    const passwordHash = result.rows[0].password_hash
    const valid = await bcrypt.compare(password, passwordHash)

    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    const token = generateToken({ id: username })
    res.json({ token, userId: username })
  } catch (err) {
    next(err)
  }
})
