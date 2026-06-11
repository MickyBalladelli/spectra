import { useEffect, useState } from 'react'
import { Button, LinearProgress, Paper, Stack, Typography } from '@mui/material'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { apiPost } from '../api/client.js'
import { DocumentInputZone } from './DocumentInputZone.jsx'

export function IngestionPanel({ socket, canIngest, onCompleted }) {
  const [title, setTitle] = useState('Demo document')
  const [text, setText] = useState('Spectra indexes dense vectors and keeps document metadata in PostgreSQL.')
  const [documents, setDocuments] = useState([])
  const [sourceType, setSourceType] = useState('raw')
  const [progress, setProgress] = useState({ percent: 0, message: 'Idle' })
  const [error, setError] = useState('')

  useEffect(() => {
    const handleCompleted = result => {
      setProgress({ percent: 100, message: `${result.chunks?.length || 0} chunks indexed` })
    }

    const handleError = payload => {
      setError(payload?.message || 'Ingestion failed')
      setProgress({ percent: 0, message: 'Ingestion failed' })
    }

    socket.on('ingestion:progress', setProgress)
    socket.on('ingestion:completed', handleCompleted)
    socket.on('ingestion:error', handleError)

    return () => {
      socket.off('ingestion:progress', setProgress)
      socket.off('ingestion:completed', handleCompleted)
      socket.off('ingestion:error', handleError)
    }
  }, [socket])

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
      setProgress({ percent: 100, message: `${result.chunks?.length || 0} chunks indexed` })
      onCompleted?.()
    } catch (err) {
      setError(err.message)
      setProgress({ percent: 0, message: 'Ingestion failed' })
    }
  }

  const ingestActive = progress.percent > 0 && progress.percent < 100
  const hasQueuedDocuments = documents.length > 0
  const canStart = canIngest && (hasQueuedDocuments || text.trim() !== '')

  return (
    <Paper sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Document ingestion</Typography>
        {!canIngest && (
          <Typography color="text.secondary">
            Sign in to ingest documents
          </Typography>
        )}
        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            startIcon={<UploadFileIcon />}
            variant="contained"
            onClick={startIngestion}
            disabled={ingestActive || !canStart}
            aria-label="Start document ingestion"
          >
            {ingestActive ? 'Ingesting...' : 'Start ingesting'}
          </Button>
          <Typography color="text.secondary">{progress.message}</Typography>
        </Stack>
        {error && (
          <Typography color="error">
            {error}
          </Typography>
        )}
        <LinearProgress
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.percent}
          variant="determinate"
          value={progress.percent}
        />
        <DocumentInputZone
          title={title}
          text={text}
          onTitleChange={setTitle}
          onTextChange={setText}
          onSourceTypeChange={setSourceType}
          onDocumentsChange={setDocuments}
        />
      </Stack>
    </Paper>
  )
}
