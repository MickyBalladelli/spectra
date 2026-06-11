import { Box, Paper, Stack, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { apiGet } from '../api/client.js'
import { ObservabilityPanel } from './ObservabilityPanel.jsx'

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

  useEffect(() => {
    apiGet('/api/observability')
      .then(setObservability)
      .catch(() => {})
  }, [events])

  return (
    <Paper sx={{ p: 2, border: 1, borderColor: 'divider' }}>
      <Stack spacing={2}>
        <Typography variant="h6">Console</Typography>

        <ObservabilityPanel data={observability} />

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
