import { useEffect, useState } from 'react'
import { Alert, Button, Chip, Paper, Stack, Typography } from '@mui/material'
import PauseCircleIcon from '@mui/icons-material/PauseCircle'
import PlayCircleIcon from '@mui/icons-material/PlayCircle'
import { apiGet, apiPost } from '../api/client.js'

export function WorkerControlPanel({ isAdmin }) {
  const [control, setControl] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadControl() {
    if (!isAdmin) return
    setControl(await apiGet('/api/ingestions/worker'))
  }

  useEffect(() => {
    loadControl().catch(() => {})
  }, [isAdmin])

  async function setPaused(paused) {
    setSaving(true)
    setError('')

    try {
      setControl(await apiPost(`/api/ingestions/worker/${paused ? 'pause' : 'resume'}`, {}))
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!isAdmin || !control) return null

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
        <Stack sx={{ flex: 1 }}>
          <Typography variant="subtitle1">Ingestion worker</Typography>
          <Typography variant="body2" color="text.secondary">
            {control.paused ? 'Paused. New jobs stay queued.' : 'Running. New jobs can be claimed.'}
          </Typography>
        </Stack>
        <Chip
          size="small"
          label={control.paused ? 'paused' : 'running'}
          color={control.paused ? 'warning' : 'success'}
        />
        {control.paused ? (
          <Button
            startIcon={<PlayCircleIcon />}
            variant="contained"
            onClick={() => setPaused(false)}
            disabled={saving}
          >
            Resume
          </Button>
        ) : (
          <Button
            startIcon={<PauseCircleIcon />}
            variant="outlined"
            color="warning"
            onClick={() => setPaused(true)}
            disabled={saving}
          >
            Pause
          </Button>
        )}
      </Stack>
      {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
    </Paper>
  )
}
