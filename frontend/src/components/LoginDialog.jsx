import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
  Typography
} from '@mui/material'
import { setAuthToken, setUserId } from '../userSession.js'

const endpointMap = {
  login: '/api/auth/login',
  register: '/api/auth/register'
}

export function AuthDialog({ open, mode, onClose }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      setUsername('')
      setPassword('')
      setConfirmPassword('')
      setError(null)
      setLoading(false)
    }
  }, [open])

  const isRegister = mode === 'register'
  const passwordsMatch = password === confirmPassword
  const validPassword = password.length >= 8
  const canSubmit = username.trim() && validPassword && (!isRegister || passwordsMatch)

  async function submit() {
    setLoading(true)
    setError(null)

    try {
      const apiUrl = window.importMetaEnv?.VITE_API_URL || process.env?.VITE_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}${endpointMap[mode]}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `${isRegister ? 'Registration' : 'Login'} failed`)
      }

      const body = await res.json()
      setAuthToken(body.token)
      setUserId(body.userId)
      location.reload()
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="auth-dialog">
      <DialogTitle id="auth-dialog">
        {isRegister ? 'Create account' : 'Sign in'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: 360 }}>
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            {isRegister ? 'Register with a username and secure password.' : 'Sign in with your existing account.'}
          </Typography>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField
            label="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoFocus
            disabled={loading}
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            helperText="Minimum 8 characters"
            disabled={loading}
          />
          {isRegister ? (
            <TextField
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              error={confirmPassword.length > 0 && !passwordsMatch}
              helperText={
                confirmPassword.length > 0 && !passwordsMatch
                  ? 'Passwords do not match.'
                  : 'Re-enter your password.'
              }
              disabled={loading}
            />
          ) : null}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={submit} variant="contained" disabled={loading || !canSubmit}>
          {isRegister ? 'Create account' : 'Sign in'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default AuthDialog
