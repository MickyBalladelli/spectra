import { pool } from './pool.js'

export const roles = ['user', 'admin']

export async function getUserRole(userId) {
  const result = await pool.query(
    'select role from users where username = $1 limit 1',
    [userId]
  )

  return result.rows[0]?.role || 'user'
}

export async function userIsAdmin(userId) {
  return await getUserRole(userId) === 'admin'
}

export async function listUsersWithRoles() {
  const result = await pool.query(
    `select username, role, created_at as "createdAt"
     from users
     order by username asc`
  )

  return result.rows
}

export async function updateUserRole({ username, role }) {
  if (!roles.includes(role)) {
    const error = new Error('Invalid role')
    error.status = 400
    throw error
  }

  const result = await pool.query(
    `update users
     set role = $2
     where username = $1
     returning username, role, created_at as "createdAt"`,
    [username, role]
  )

  return result.rows[0] || null
}

export async function getNextRegisteredUserRole() {
  const result = await pool.query('select count(*)::int as count from users')

  return result.rows[0]?.count === 0 ? 'admin' : 'user'
}
