import { Box, Paper, Stack, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { apiDownload, apiGet } from '../api/client.js'
import { ObservabilityPanel } from './ObservabilityPanel.jsx'
import { ObservabilityFilters, emptyObservabilityFilters } from './ObservabilityFilters.jsx'

function getEventTitle(event) {
  return event.stage || event.status || 'event'
}

function getEventDescription(event) {
  if (event.message) return event.message
  if (typeof event.percent === 'number') return `${event.percent}%`
  if (event.reason) return event.reason

  return 'No details'
}

function formatEventDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleString()
}

export function ConsolePanel({ events }) {
  const [observability, setObservability] = useState(null)
  const [filters, setFilters] = useState(emptyObservabilityFilters)

  function getObservabilityParams(limit = '50') {
    const params = new URLSearchParams({ limit })

    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })

    return params
  }

  useEffect(() => {
    const params = getObservabilityParams()

    apiGet(`/api/observability?${params.toString()}`)
      .then(setObservability)
      .catch(() => {})
  }, [events, filters])

  async function downloadLogs() {
    const params = getObservabilityParams('1000')
    const blob = await apiDownload(`/api/observability/download?${params.toString()}`)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `spectra-logs-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <Paper sx={{ p: 2, border: 1, borderColor: 'divider' }}>
      <Stack spacing={2}>
        <Typography variant="h6">Console</Typography>

        <ObservabilityFilters filters={filters} onChange={setFilters} onDownload={downloadLogs} />
        <ObservabilityPanel data={observability} type={filters.type} />

        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
          {events.map((event, index) => (
            <Box
              key={`${event.stage || event.status}-${index}`}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '180px 180px 1fr' },
                gap: 1,
                p: 1.25,
                borderTop: index === 0 ? 0 : 1,
                borderColor: 'divider',
                bgcolor: index % 2 === 0 ? 'background.default' : 'background.paper'
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {formatEventDate(event.at)}
              </Typography>
              <Typography variant="body2">
                {getEventTitle(event)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {getEventDescription(event)}
              </Typography>
            </Box>
          ))}
          {events.length === 0 && (
            <Typography color="text.secondary" sx={{ p: 2 }}>No socket events yet</Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  )
}
