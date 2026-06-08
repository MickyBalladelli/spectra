import { useState } from 'react'
import { Box, IconButton, Tooltip } from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { getUserId } from '../userSession.js'

export function UserDebugControl() {
  const current = getUserId()
  const [value] = useState(current)

  function copy() {
    navigator.clipboard?.writeText(value).catch(() => {})
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Tooltip title="Copy user id">
        <IconButton size="small" onClick={copy} aria-label="copy user id">
          <ContentCopyIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  )
}

export default UserDebugControl
