import { Box, Button, Chip, LinearProgress, Paper, Stack, Typography } from '@mui/material'
import ReplayIcon from '@mui/icons-material/Replay'

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
  const rows = mergeRows(files, jobs)
  if (rows.length === 0) return null

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      {rows.map((row, index) => (
        <Box
          key={row.key}
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 160px 120px' },
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
              <Typography variant="body2" color="text.secondary">
                {row.percent || 0}%
              </Typography>
            )}
          </Stack>
        </Box>
      ))}
    </Paper>
  )
}
