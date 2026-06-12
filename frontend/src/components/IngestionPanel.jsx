import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material'
import CancelIcon from '@mui/icons-material/Cancel'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { apiGet, apiPost, apiUploadFiles } from '../api/client.js'
import { DocumentInputZone } from './DocumentInputZone.jsx'
import { BatchIngestFileList } from './BatchIngestFileList.jsx'
import { WorkerControlPanel } from './WorkerControlPanel.jsx'

function getJobDetail(job) {
  if (job.status === 'queued' && job.queuePosition) {
    return `Queued at position ${job.queuePosition}`
  }

  if (job.status === 'canceled') return 'Ingestion canceled'
  if (job.status === 'canceling') return 'Cancel requested'

  if (job.status === 'failed') {
    return job.error || job.message || 'Ingestion failed'
  }

  return job.message || job.stage || job.status
}

function canCancelJob(job) {
  return ['queued', 'running'].includes(job.status)
}

function getJobColor(job) {
  if (job.status === 'completed') return 'success'
  if (job.status === 'failed') return 'error'
  if (['canceled', 'canceling'].includes(job.status)) return 'warning'
  return 'default'
}

export function IngestionPanel({ socket, canIngest, onCompleted }) {
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [files, setFiles] = useState([])
  const [sourceType, setSourceType] = useState('raw')
  const [duplicatePolicy, setDuplicatePolicy] = useState('skip')
  const [progress, setProgress] = useState({ percent: 0, message: 'Idle' })
  const [error, setError] = useState('')
  const [jobs, setJobs] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeJobId, setActiveJobId] = useState('')
  const [viewer, setViewer] = useState({ isAdmin: false })

  async function refreshJobs() {
    if (!canIngest) return
    setJobs(await apiGet('/api/ingestions/jobs'))
  }

  useEffect(() => {
    const handleCompleted = result => {
      setProgress({ percent: 100, message: `${result.chunkCount ?? result.chunks?.length ?? 0} chunks indexed` })
      refreshJobs().catch(() => {})
      onCompleted?.()
    }

    const handleError = payload => {
      setError(payload?.message || 'Ingestion failed')
      setProgress({ percent: 0, message: 'Ingestion failed' })
      refreshJobs().catch(() => {})
    }

    const handleJob = job => {
      setJobs(current => {
        const existing = current.find(item => item.id === job.id)
        const nextJob = {
          ...job,
          queuePosition: job.queuePosition ?? existing?.queuePosition ?? null
        }

        return [nextJob, ...current.filter(item => item.id !== job.id)].slice(0, 10)
      })
      setProgress({ percent: job.percent || 0, message: job.message || job.status })
      refreshJobs().catch(() => {})
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

  useEffect(() => {
    if (!canIngest) return

    apiGet('/api/auth/me')
      .then(setViewer)
      .catch(() => {})
  }, [canIngest])

  async function startIngestion() {
    if (!canIngest) {
      setError('Sign in to ingest documents')
      return
    }

    if (isSubmitting) return

    setIsSubmitting(true)
    setError('')
    setProgress({ percent: 5, message: files.length > 0 ? `Uploading ${files.length} files` : 'Queued' })

    try {
      const result = files.length > 0
        ? await apiUploadFiles('/api/ingestions/files', files, { source: 'dashboard', duplicatePolicy })
        : await apiPost('/api/ingestions', { title, sourceType, text, metadata: { source: 'dashboard', duplicatePolicy } })
      setActiveJobId(result.job.id)
      setJobs(current => [result.job, ...current.filter(item => item.id !== result.job.id)].slice(0, 10))
      setProgress({
        percent: result.job.percent || 0,
        message: result.job.message || (files.length > 0 ? `Queued ${files.length} files for worker` : 'Queued for worker')
      })
    } catch (err) {
      setError(err.message)
      setProgress({ percent: 0, message: 'Ingestion failed' })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function retryFailedFile(jobId, fileIndex) {
    if (!canIngest) return

    setError('')
    try {
      const result = await apiPost(`/api/ingestions/jobs/${jobId}/retry`, { fileIndex })
      setActiveJobId(result.job.id)
      setJobs(current => [result.job, ...current.filter(item => item.id !== result.job.id)].slice(0, 10))
      setProgress({
        percent: result.job.percent || 0,
        message: result.job.message || 'Retry queued'
      })
    } catch (err) {
      setError(err.message)
    }
  }

  async function cancelJob(jobId) {
    setError('')

    try {
      const result = await apiPost(`/api/ingestions/jobs/${jobId}/cancel`, {})
      setJobs(current => [result.job, ...current.filter(item => item.id !== result.job.id)].slice(0, 10))
      setProgress({
        percent: result.job.percent || 0,
        message: result.job.message || result.job.status
      })
    } catch (err) {
      setError(err.message)
    }
  }

  const hasFiles = files.length > 0
  const canStart = canIngest && (hasFiles || text.trim() !== '')

  return (
    <Paper sx={{ p: 2, border: 1, borderColor: 'divider' }}>
      <Stack spacing={2}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) auto minmax(220px, 320px)' },
            gap: 2,
            alignItems: 'center'
          }}
        >
          <Box sx={{ minWidth: 0 }}>
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
            disabled={isSubmitting || !canStart}
            aria-label="Start document ingestion"
          >
            {isSubmitting ? 'Uploading...' : 'Start ingesting'}
          </Button>
          <Typography
            color="text.secondary"
            sx={{
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {hasFiles ? `${files.length} files selected - ${progress.message}` : progress.message}
          </Typography>
        </Box>
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
        <WorkerControlPanel isAdmin={viewer.isAdmin} />
        <FormControl size="small" sx={{ maxWidth: 320 }}>
          <InputLabel id="duplicate-policy-label">Duplicate policy</InputLabel>
          <Select
            labelId="duplicate-policy-label"
            label="Duplicate policy"
            value={duplicatePolicy}
            onChange={event => setDuplicatePolicy(event.target.value)}
          >
            <MenuItem value="skip">Skip duplicate</MenuItem>
            <MenuItem value="replace">Replace existing</MenuItem>
            <MenuItem value="version">Create version</MenuItem>
          </Select>
        </FormControl>
        <DocumentInputZone
          title={title}
          text={text}
          files={files}
          onTitleChange={setTitle}
          onTextChange={setText}
          onSourceTypeChange={setSourceType}
          onFilesChange={setFiles}
        />
        <BatchIngestFileList
          files={files}
          jobs={jobs.filter(job => job.id === activeJobId)}
          onRetry={retryFailedFile}
        />
        {jobs.length > 0 && (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Job</TableCell>
                  <TableCell sx={{ width: 160 }}>Status</TableCell>
                  <TableCell align="right" sx={{ width: 90 }}>Progress</TableCell>
                  <TableCell align="right" sx={{ width: 120 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {jobs.slice(0, 5).map(job => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {job.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        color={job.status === 'failed' ? 'error.main' : 'text.secondary'}
                        sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      >
                        {getJobDetail(job)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={job.queuePosition ? `${job.status} #${job.queuePosition}` : job.status}
                        color={getJobColor(job)}
                        sx={{ width: 138 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {job.percent || 0}%
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        color="warning"
                        variant="outlined"
                        startIcon={<CancelIcon />}
                        onClick={() => cancelJob(job.id)}
                        disabled={!canCancelJob(job)}
                        sx={{ width: 100 }}
                      >
                        Cancel
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Stack>
    </Paper>
  )
}
