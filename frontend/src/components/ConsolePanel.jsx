import { Chip, Paper, Stack, Typography } from '@mui/material'

export function ConsolePanel({ status, events }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Console</Typography>
          <Chip
            size="small"
            label={status}
            color={status === 'connected' ? 'success' : 'default'}
          />
        </Stack>

        <Stack spacing={1}>
          {events.map((event, index) => (
            <Paper key={`${event.stage || event.status}-${index}`} variant="outlined" sx={{ p: 1 }}>
              <Typography variant="body2">{event.stage || event.status}</Typography>
              <Typography variant="caption" color="text.secondary">
                {event.message || event.at || `${event.percent || 0}%`}
              </Typography>
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
