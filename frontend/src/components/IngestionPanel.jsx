import { useEffect, useState } from 'react'
import { Alert, Box, Button, Chip, LinearProgress, Paper, Stack, Typography } from '@mui/material'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { apiGet, apiPost } from '../api/client.js'
import { DocumentInputZone } from './DocumentInputZone.jsx'

export function IngestionPanel({ socket, canIngest, onCompleted }) {
  const [title, setTitle] = useState('Demo document')
  const [text, setText] = useState('Spectra indexes dense vectors and keeps document metadata in PostgreSQL.')
  const [documents, setDocuments] = useState([])
  const [sourceType, setSourceType] = useState('raw')
  const [progress, setProgress] = useState({ percent: 0, message: 'Idle' })
  const [error, setError] = useState('')
  const [jobs, setJobs] = useState([])

  async function refreshJobs() {
    if (!canIngest) return
    setJobs(await apiGet('/api/ingestions/jobs'))
  }

  useEffect(() => {
    const handleCompleted = result => {
      setProgress({ percent: 100, message: `${result.chunks?.length || 0} chunks indexed` })
      refreshJobs().catch(() => {})
      onCompleted?.()
    }

    const handleError = payload => {
      setError(payload?.message || 'Ingestion failed')
      setProgress({ percent: 0, message: 'Ingestion failed' })
      refreshJobs().catch(() => {})
    }

    const handleJob = job => {
      setJobs(current => [job, ...current.filter(item => item.id !== job.id)].slice(0, 10))
      setProgress({ percent: job.percent || 0, message: job.message || job.status })
    }

    socket.on('ingestion:progress', setProgress)
    socket.on('ingestion:completed', handleCompleted)
    socket.on('ingestion:error', handleError)
    socket.on('ingestion:job', handleJob)

    return () => {
      socket.off('ingestion:progress', setProgress)
      socket.off('ingestion:completed', handleCompleted)
      socket.off('ingestion:error', handleError)
      socket.off('ingestion:job', handleJob)
    }
  }, [socket, canIngest, onCompleted])

  useEffect(() => {
    refreshJobs().catch(() => {})
  }, [canIngest])

  async function startIngestion() {
    if (!canIngest) {
      setError('Sign in to ingest documents')
      return
    }

    setError('')
    setProgress({ percent: 5, message: documents.length > 0 ? `Queued ${documents.length} documents` : 'Queued' })

    const payload = documents.length > 0
      ? { documents, metadata: { source: 'dashboard' } }
      : { title, sourceType, text, metadata: { source: 'dashboard' } }

    try {
      const result = await apiPost('/api/ingestions', payload)
      setJobs(current => [result.job, ...current.filter(item => item.id !== result.job.id)].slice(0, 10))
      setProgress({ percent: result.job.percent || 0, message: result.job.message || 'Queued' })
    } catch (err) {
      setError(err.message)
      setProgress({ percent: 0, message: 'Ingestion failed' })
    }
  }

  const ingestActive = progress.percent > 0 && progress.percent < 100
  const hasQueuedDocuments = documents.length > 0
  const canStart = canIngest && (hasQueuedDocuments || text.trim() !== '')

  return (
    <Paper sx={{ p: 2, border: 1, borderColor: 'divider' }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">Document ingestion</Typography>
            {!canIngest && (
              <Typography color="text.secondary">
                Sign in to ingest documents
              </Typography>
            )}
          </Box>
          <Button
            startIcon={<UploadFileIcon />}
            variant="contained"
            onClick={startIngestion}
            disabled={ingestActive || !canStart}
            aria-label="Start document ingestion"
          >
            {ingestActive ? 'Ingesting...' : 'Start ingesting'}
          </Button>
          <Typography color="text.secondary" sx={{ minWidth: { md: 180 } }}>
            {progress.message}
          </Typography>
        </Stack>
        {error && (
          <Alert severity="error">
            {error}
          </Alert>
        )}
        <LinearProgress
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.percent}
          variant="determinate"
          value={progress.percent}
          sx={{ height: 8, borderRadius: 1 }}
        />
        <DocumentInputZone
          title={title}
          text={text}
          onTitleChange={setTitle}
          onTextChange={setText}
          onSourceTypeChange={setSourceType}
          onDocumentsChange={setDocuments}
        />
        {jobs.length > 0 && (
          <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
            {jobs.slice(0, 5).map((job, index) => (
              <Box
                key={job.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 120px 110px' },
                  gap: 1,
                  alignItems: 'center',
                  p: 1.25,
                  borderTop: index === 0 ? 0 : 1,
                  borderColor: 'divider'
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {job.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {job.message || job.stage || job.status}
                  </Typography>
                </Box>
                <Chip size="small" label={job.status} color={job.status === 'completed' ? 'success' : job.status === 'failed' ? 'error' : 'default'} />
                <Typography variant="body2" color="text.secondary">
                  {job.percent || 0}%
                </Typography>
              </Box>
            ))}
          </Paper>
        )}
      </Stack>
    </Paper>
  )
}
