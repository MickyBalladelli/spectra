import { Box, Grid, LinearProgress, Paper, Stack, Typography, Skeleton } from '@mui/material'

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

export function ClusterOverview({ stats }) {
  const loading = stats === null
  const data = stats || {
    documents: 0,
    vectors: 0,
    compression_factor: 16,
    avg_latency_ms: 0
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
            <MetricCard label="Vectors" value={data.vectors} detail="turbovec keys" />
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
            <MetricCard label="Compression" value={`${data.compression_factor}x`} detail="TurboQuant target" />
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, gap: 2 }}>
          <Typography variant="subtitle2">Cluster pressure</Typography>
          <Typography variant="body2" color="text.secondary">{data.vectors || 0} vectors</Typography>
        </Box>
        {loading ? (
          <LinearProgress />
        ) : (
          <LinearProgress variant="determinate" value={Math.min(100, Number(data.vectors || 0) / 10)} sx={{ height: 8, borderRadius: 1 }} />
        )}
      </Paper>
    </Stack>
  )
}
