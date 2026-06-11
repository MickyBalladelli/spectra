import { Box, Chip, Paper, Stack, Typography } from '@mui/material'

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

function statusColor(status) {
  if (status >= 500) return 'error'
  if (status >= 400) return 'warning'
  if (status >= 200 && status < 300) return 'success'
  return 'default'
}

function LogTable({ title, rows, columns, empty }) {
  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle1">{title}</Typography>
      </Box>
      {rows.map((row, index) => (
        <Box
          key={row.id || `${title}-${index}`}
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: columns.map(column => column.width || '1fr').join(' ') },
            gap: 1,
            p: 1.25,
            borderTop: index === 0 ? 0 : 1,
            borderColor: 'divider',
            bgcolor: index % 2 === 0 ? 'background.default' : 'background.paper'
          }}
        >
          {columns.map(column => (
            <Box key={column.key} sx={{ minWidth: 0 }}>
              {column.render ? column.render(row) : (
                <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {row[column.key]}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      ))}
      {rows.length === 0 && (
        <Typography color="text.secondary" sx={{ p: 2 }}>{empty}</Typography>
      )}
    </Paper>
  )
}

function SearchLatencyChart({ rows }) {
  const maxLatency = Math.max(...rows.map(row => row.latencyMs || 0), 1)
  const visibleRows = rows.slice(0, 20).reverse()

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>Search latency</Typography>
      <Stack spacing={1}>
        {visibleRows.map(row => (
          <Box key={row.id}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" color="text.secondary" sx={{ width: 120 }}>
                {formatDate(row.createdAt)}
              </Typography>
              <Box sx={{ flex: 1, bgcolor: 'action.hover', height: 10, borderRadius: 1, overflow: 'hidden' }}>
                <Box
                  sx={{
                    width: `${Math.max(4, ((row.latencyMs || 0) / maxLatency) * 100)}%`,
                    bgcolor: 'primary.main',
                    height: '100%'
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ width: 64, textAlign: 'right' }}>
                {row.latencyMs} ms
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: { md: 15 }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row.queryText || 'query'}
            </Typography>
          </Box>
        ))}
        {visibleRows.length === 0 && (
          <Typography color="text.secondary">No search latency yet</Typography>
        )}
      </Stack>
    </Paper>
  )
}

export function ObservabilityPanel({ data }) {
  const requests = data?.requests || []
  const jobs = data?.jobs || []
  const workers = data?.workers || []
  const errors = data?.errors || []
  const searchLatency = data?.searchLatency || []

  return (
    <Stack spacing={2}>
      <SearchLatencyChart rows={searchLatency} />

      <LogTable
        title="Error history"
        rows={errors.slice(0, 20)}
        empty="No errors recorded"
        columns={[
          { key: 'at', width: '180px', render: row => <Typography variant="caption" color="text.secondary">{formatDate(row.at)}</Typography> },
          { key: 'source', width: '120px', render: row => <Chip size="small" color="error" label={row.source || 'error'} /> },
          { key: 'message', width: '1fr', render: row => <Typography variant="body2" color="error.main" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.message}</Typography> }
        ]}
      />

      <LogTable
        title="Request logs"
        rows={requests.slice(0, 20)}
        empty="No requests recorded"
        columns={[
          { key: 'at', width: '180px', render: row => <Typography variant="caption" color="text.secondary">{formatDate(row.at)}</Typography> },
          { key: 'method', width: '80px', render: row => <Chip size="small" label={row.method} /> },
          { key: 'status', width: '90px', render: row => <Chip size="small" color={statusColor(row.status)} label={row.status} /> },
          { key: 'path', width: '1fr', render: row => <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.path}</Typography> },
          { key: 'latencyMs', width: '90px', render: row => <Typography variant="body2" color="text.secondary">{row.latencyMs} ms</Typography> }
        ]}
      />

      <LogTable
        title="Job logs"
        rows={jobs.slice(0, 20)}
        empty="No job logs recorded"
        columns={[
          { key: 'at', width: '180px', render: row => <Typography variant="caption" color="text.secondary">{formatDate(row.at)}</Typography> },
          { key: 'status', width: '120px', render: row => <Chip size="small" label={row.status || row.event} /> },
          { key: 'title', width: '1fr', render: row => <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.title}</Typography> },
          { key: 'message', width: '1fr', render: row => <Typography variant="body2" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.message}</Typography> }
        ]}
      />

      <LogTable
        title="Worker logs"
        rows={workers.slice(0, 20)}
        empty="No worker logs recorded"
        columns={[
          { key: 'at', width: '180px', render: row => <Typography variant="caption" color="text.secondary">{formatDate(row.at)}</Typography> },
          { key: 'workerId', width: '1fr', render: row => <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.workerId}</Typography> },
          { key: 'message', width: '1fr', render: row => <Typography variant="body2" color={row.error ? 'error.main' : 'text.secondary'}>{row.message}</Typography> }
        ]}
      />
    </Stack>
  )
}
