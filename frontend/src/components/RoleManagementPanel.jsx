import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography
} from '@mui/material'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import { apiGet, apiPatch } from '../api/client.js'

export function RoleManagementPanel({ isAdmin }) {
  const [users, setUsers] = useState([])
  const [savingUser, setSavingUser] = useState('')
  const [error, setError] = useState('')

  async function loadUsers() {
    if (!isAdmin) return
    setUsers(await apiGet('/api/auth/users'))
  }

  useEffect(() => {
    loadUsers().catch(() => {})
  }, [isAdmin])

  async function changeRole(username, role) {
    setSavingUser(username)
    setError('')

    try {
      const updated = await apiPatch(`/api/auth/users/${encodeURIComponent(username)}/role`, { role })
      setUsers(current => current.map(user => user.username === username ? updated : user))
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingUser('')
    }
  }

  if (!isAdmin) return null

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} alignItems="center">
          <AdminPanelSettingsIcon color="primary" />
          <Typography variant="subtitle1">Role management</Typography>
        </Stack>
        {error && <Alert severity="error">{error}</Alert>}
        <Stack sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
          {users.map((user, index) => (
            <Box
              key={user.username}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 130px 180px' },
                gap: 1,
                alignItems: 'center',
                p: 1.25,
                borderTop: index === 0 ? 0 : 1,
                borderColor: 'divider',
                bgcolor: index % 2 === 0 ? 'background.default' : 'background.paper'
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.username}
              </Typography>
              <Chip size="small" label={user.role} color={user.role === 'admin' ? 'primary' : 'default'} />
              <FormControl size="small">
                <InputLabel id={`role-${user.username}`}>Role</InputLabel>
                <Select
                  labelId={`role-${user.username}`}
                  label="Role"
                  value={user.role}
                  onChange={event => changeRole(user.username, event.target.value)}
                  disabled={savingUser === user.username}
                >
                  <MenuItem value="user">User</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
            </Box>
          ))}
          {users.length === 0 && (
            <Typography color="text.secondary" sx={{ p: 2 }}>No users found</Typography>
          )}
        </Stack>
        <Button variant="outlined" onClick={() => loadUsers().catch(() => {})} sx={{ alignSelf: 'flex-start' }}>
          Refresh roles
        </Button>
      </Stack>
    </Paper>
  )
}
