import { useEffect, useState } from 'react'
import { Box, Button, Grid, LinearProgress, Paper, Stack, Typography, Skeleton } from '@mui/material'
import AutorenewIcon from '@mui/icons-material/Autorenew'
import { apiPost } from '../api/client.js'

function MetricCard({ label, value, detail }) {
  return (
    <Paper sx={{ p: 2, border: 1, borderColor: 'divider', height: '100%' }}>
      <Stack spacing={1}>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="h4">{value}</Typography>
        <Typography variant="body2" color="text.secondary">{detail}</Typography>
      </Stack>
    </Paper>
  )
}

export function ClusterOverview({ stats, socket, onRebuilt }) {
  const loading = stats === null
  const [rebuild, setRebuild] = useState(null)
  const [rebuildError, setRebuildError] = useState('')
  const data = stats || {
    documents: 0,
    chunks: 0,
    vectors: 0,
    compression_factor: 16,
    avg_latency_ms: 0
  }
  const chunkCount = Number(data.chunks ?? data.vectors ?? 0)
  const vectorCount = Number(data.vectors ?? 0)
  const missingVectors = Math.max(0, chunkCount - vectorCount)
  const rebuildActive = rebuild && rebuild.percent < 100 && !rebuildError

  useEffect(() => {
    if (!socket) return

    const handleProgress = progress => {
      setRebuild(progress)
      setRebuildError('')
    }
    const handleCompleted = result => {
      setRebuild({ ...result, percent: 100 })
      setRebuildError('')
      onRebuilt?.()
    }
    const handleError = payload => {
      setRebuildError(payload?.message || 'Vector rebuild failed')
    }

    socket.on('index:rebuild:progress', handleProgress)
    socket.on('index:rebuild:completed', handleCompleted)
    socket.on('index:rebuild:error', handleError)

    return () => {
      socket.off('index:rebuild:progress', handleProgress)
      socket.off('index:rebuild:completed', handleCompleted)
      socket.off('index:rebuild:error', handleError)
    }
  }, [socket, onRebuilt])

  async function startRebuild() {
    setRebuildError('')
    setRebuild({ percent: 0, processed: 0, total: chunkCount, message: 'Starting vector rebuild' })

    try {
      await apiPost('/api/indexes/rebuild', {})
    } catch (error) {
      setRebuildError(error.message)
      setRebuild(null)
    }
  }

  return (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          {loading ? (
            <Paper sx={{ p: 2 }}>
              <Stack spacing={1}>
                <Skeleton width="40%" />
                <Skeleton variant="text" width="60%" height={40} />
                <Skeleton width="50%" />
              </Stack>
            </Paper>
          ) : (
            <MetricCard label="Documents" value={data.documents} detail="Postgres rows" />
          )}
        </Grid>
        <Grid item xs={12} md={3}>
          {loading ? (
            <Paper sx={{ p: 2 }}>
              <Stack spacing={1}>
                <Skeleton width="40%" />
                <Skeleton variant="text" width="60%" height={40} />
                <Skeleton width="50%" />
              </Stack>
            </Paper>
          ) : (
            <MetricCard label="Vectors" value={vectorCount} detail="pgvector embeddings" />
          )}
        </Grid>
        <Grid item xs={12} md={3}>
          {loading ? (
            <Paper sx={{ p: 2 }}>
              <Stack spacing={1}>
                <Skeleton width="40%" />
                <Skeleton variant="text" width="60%" height={40} />
                <Skeleton width="50%" />
              </Stack>
            </Paper>
          ) : (
            <MetricCard label="Chunks" value={chunkCount} detail="DB chunk rows" />
          )}
        </Grid>
        <Grid item xs={12} md={3}>
          {loading ? (
            <Paper sx={{ p: 2 }}>
              <Stack spacing={1}>
                <Skeleton width="40%" />
                <Skeleton variant="text" width="60%" height={40} />
                <Skeleton width="50%" />
              </Stack>
            </Paper>
          ) : (
            <MetricCard label="Avg latency" value={`${data.avg_latency_ms}ms`} detail="Recent query audit" />
          )}
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, border: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, gap: 2, alignItems: 'center' }}>
          <Box>
            <Typography variant="subtitle2">Vector index</Typography>
            <Typography variant="body2" color={missingVectors > 0 ? 'warning.main' : 'text.secondary'}>
              {vectorCount} vectors for {chunkCount} DB chunks{missingVectors > 0 ? ` - ${missingVectors} missing` : ''}
            </Typography>
          </Box>
          <Button
            startIcon={<AutorenewIcon />}
            variant="outlined"
            size="small"
            onClick={startRebuild}
            disabled={loading || rebuildActive}
          >
            {rebuildActive ? 'Rebuilding' : 'Rebuild index'}
          </Button>
        </Box>
        {loading ? (
          <LinearProgress />
        ) : (
          <LinearProgress
            variant="determinate"
            value={rebuild ? rebuild.percent || 0 : chunkCount === 0 ? 100 : Math.round((vectorCount / chunkCount) * 100)}
            sx={{ height: 8, borderRadius: 1 }}
          />
        )}
        {(rebuild || rebuildError) && (
          <Typography variant="body2" color={rebuildError ? 'error.main' : 'text.secondary'} sx={{ mt: 1 }}>
            {rebuildError || rebuild.message || `Rebuilt ${rebuild.processed || 0} of ${rebuild.total || chunkCount}`}
          </Typography>
        )}
      </Paper>
    </Stack>
  )
}
