import { Box, Paper, Stack, Typography } from '@mui/material'

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
  return (
    <Paper sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Console</Typography>

        <Stack spacing={1}>
          {events.map((event, index) => (
            <Paper key={`${event.stage || event.status}-${index}`} variant="outlined" sx={{ p: 1 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '180px 180px 1fr' }, gap: 1 }}>
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
            </Paper>
          ))}
          {events.length === 0 && (
            <Typography color="text.secondary">No socket events yet</Typography>
          )}
        </Stack>
      </Stack>
    </Paper>
  )
}
