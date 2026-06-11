import { Box, Typography } from '@mui/material'

export function EmptyState({ icon, title, message }) {
  return (
    <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
      {icon}
      <Typography variant="h6">{title}</Typography>
      <Typography>{message}</Typography>
    </Box>
  )
}
