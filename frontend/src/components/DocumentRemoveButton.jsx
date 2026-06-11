import { useState } from 'react'
import { Button, IconButton, Tooltip } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import { apiDelete } from '../api/client.js'

export function DocumentRemoveButton({ documentId, onRemoved, iconOnly = false }) {
  const [deleting, setDeleting] = useState(false)

  async function removeDocument() {
    setDeleting(true)

    try {
      await apiDelete(`/api/indexes/documents/${documentId}`)
      onRemoved?.(documentId)
    } finally {
      setDeleting(false)
    }
  }

  if (iconOnly) {
    return (
      <Tooltip title="Remove document">
        <span>
          <IconButton
            aria-label="Remove document"
            color="error"
            disabled={deleting}
            onClick={removeDocument}
            size="small"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    )
  }

  return (
    <Button
      color="error"
      disabled={deleting}
      onClick={removeDocument}
      size="small"
      startIcon={<DeleteIcon />}
    >
      {deleting ? 'Removing...' : 'Remove'}
    </Button>
  )
}
