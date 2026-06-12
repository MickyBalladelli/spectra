import { Box, Button, Chip, LinearProgress, Paper, Stack, Typography } from '@mui/material'
import ReplayIcon from '@mui/icons-material/Replay'
import { useRef } from 'react'

function formatBytes(value) {
  if (!value) return ''
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

function getStatusColor(status) {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'duplicate') return 'warning'
  if (status === 'running') return 'primary'
  return 'default'
}

function getStatusLabel(status) {
  if (status === 'duplicate') return 'Skipped duplicate'
  if (status === 'completed') return 'Indexed'
  if (status === 'failed') return 'Failed'
  if (status === 'running') return 'Running'
  return 'Queued'
}

function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return ''
  const seconds = Math.ceil(ms / 1000)
  if (seconds < 60) return `${seconds}s left`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  if (minutes < 60) return rest > 0 ? `${minutes}m ${rest}s left` : `${minutes}m left`
  const hours = Math.floor(minutes / 60)
  const restMinutes = minutes % 60
  return restMinutes > 0 ? `${hours}h ${restMinutes}m left` : `${hours}h left`
}

function getEta(row, estimates) {
  if (row.status !== 'running') return ''
  if (!row.percent || row.percent <= 0 || row.percent >= 100) return ''

  const key = `${row.jobId || 'local'}-${row.index}`
  const now = Date.now()
  const current = estimates.current[key]

  if (!current || row.percent < current.startPercent || row.percent === 0) {
    estimates.current[key] = {
      startAt: now,
      startPercent: row.percent
    }
    return ''
  }

  const elapsed = now - current.startAt
  const gained = row.percent - current.startPercent
  if (elapsed < 1000 || gained <= 0) return ''

  const msPerPercent = elapsed / gained
  return formatDuration(msPerPercent * (100 - row.percent))
}

function mergeRows(files, jobs) {
  const rows = files.map((file, index) => ({
    key: `${file.name}-${file.size}-${index}`,
    index,
    fileName: file.name,
    detail: formatBytes(file.size),
    status: 'selected',
    percent: 0,
    message: 'Ready',
    jobId: null
  }))

  for (const job of jobs) {
    const jobFiles = job.result?.files || []

    for (const file of jobFiles) {
      const row = rows[file.index] || {
        key: `${job.id}-${file.index}`,
        index: file.index,
        fileName: file.fileName,
        detail: '',
        status: 'queued',
        percent: 0,
        message: 'Queued',
        jobId: job.id
      }

      row.fileName = file.fileName || row.fileName
      row.status = file.status || row.status
      row.percent = file.percent ?? row.percent
      row.message = file.message || file.error || row.message
      row.error = file.error
      row.jobId = job.id
      rows[file.index] = row
    }
  }

  return rows
}

export function BatchIngestFileList({ files, jobs, onRetry }) {
  const estimates = useRef({})
  const rows = mergeRows(files, jobs)
  if (rows.length === 0) return null

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      {rows.map((row, index) => {
        const eta = getEta(row, estimates)

        return (
          <Box
            key={row.key}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 160px 150px' },
              gap: 1,
              alignItems: 'center',
              p: 1.25,
              borderTop: index === 0 ? 0 : 1,
              borderColor: 'divider'
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {row.fileName}
              </Typography>
              <Typography
                variant="caption"
                color={row.status === 'failed' ? 'error.main' : 'text.secondary'}
                sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {row.error || row.message || row.detail}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={row.percent || 0}
                sx={{ mt: 0.75, height: 6, borderRadius: 1 }}
              />
            </Box>
            <Chip
              size="small"
              label={getStatusLabel(row.status)}
              color={getStatusColor(row.status)}
              variant={row.status === 'selected' ? 'outlined' : 'filled'}
            />
            <Stack direction="row" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
              {row.status === 'failed' && row.jobId && (
                <Button
                  size="small"
                  startIcon={<ReplayIcon />}
                  onClick={() => onRetry?.(row.jobId, row.index)}
                >
                  Retry
                </Button>
              )}
              {row.status !== 'failed' && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: { md: 'right' } }}>
                  {row.percent || 0}%{eta ? ` - ${eta}` : ''}
                </Typography>
              )}
            </Stack>
          </Box>
        )
      })}
    </Paper>
  )
}
