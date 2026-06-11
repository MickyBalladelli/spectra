import {
  Box,
  Chip,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import DescriptionIcon from '@mui/icons-material/Description'
import DeleteIcon from '@mui/icons-material/Delete'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import LanguageIcon from '@mui/icons-material/Language'
import SearchIcon from '@mui/icons-material/Search'
import { formatDistanceToNow } from 'date-fns'
import { useMemo, useState } from 'react'
import { apiDelete } from '../api/client.js'

export function DocumentList({ documents, onDocumentRemoved }) {
  const [nameFilter, setNameFilter] = useState('')
  const filteredDocuments = useMemo(() => {
    const query = nameFilter.trim().toLowerCase()
    if (!query) return documents || []

    return (documents || []).filter(doc => String(doc.title || '').toLowerCase().includes(query))
  }, [documents, nameFilter])

  async function removeDocument(documentId) {
    await apiDelete(`/api/indexes/documents/${documentId}`)
    onDocumentRemoved?.()
  }

  if (!documents || documents.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
        <DescriptionIcon sx={{ fontSize: 48, mb: 2 }} />
        <Typography variant="h6">No documents ingested yet</Typography>
        <Typography>Ingest your first document to get started</Typography>
      </Box>
    )
  }

  return (
    <Paper sx={{ p: 2, border: 1, borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6">Documents</Typography>
          <Chip
            size="small"
            label={nameFilter ? `${filteredDocuments.length} of ${documents.length}` : `${documents.length} total`}
            color="primary"
            variant="outlined"
          />
        </Box>
        <TextField
          size="small"
          label="Filter document name"
          value={nameFilter}
          onChange={event => setNameFilter(event.target.value)}
          sx={{ width: { xs: '100%', sm: 320 } }}
          InputProps={{
            startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
          }}
        />
      </Box>

      <Stack sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
        {filteredDocuments.map((doc, index) => {
          const SourceIcon = doc.sourceType === 'url' ? LanguageIcon : InsertDriveFileIcon
          return (
            <Box
              key={doc.id}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr auto', md: '1fr 140px 180px auto' },
                gap: 2,
                alignItems: 'center',
                p: 1.5,
                borderTop: index === 0 ? 0 : 1,
                borderColor: 'divider',
                bgcolor: index % 2 === 0 ? 'background.default' : 'background.paper'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                <SourceIcon color="primary" />
                <Typography variant="body2" sx={{ ml: 1, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {doc.title}
                </Typography>
              </Box>
              <Chip size="small" label={doc.sourceType} variant="outlined" />
              <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' } }}>
                {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
              </Typography>
              <IconButton aria-label={`Remove ${doc.title}`} onClick={() => removeDocument(doc.id)}>
                <DeleteIcon />
              </IconButton>
            </Box>
          )
        })}
        {filteredDocuments.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
            No documents match this name
          </Box>
        )}
      </Stack>
    </Paper>
  )
}
