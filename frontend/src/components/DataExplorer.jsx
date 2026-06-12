import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import SearchIcon from '@mui/icons-material/Search'
import TravelExploreIcon from '@mui/icons-material/TravelExplore'
import { EmptyState } from './EmptyState.jsx'
import { ChunkInspectorDrawer } from './ChunkInspectorDrawer.jsx'

function copyText(value) {
  navigator.clipboard?.writeText(String(value || '')).catch(() => {})
}

export function DataExplorer({ chunks }) {
  const [query, setQuery] = useState('')
  const [selectedChunk, setSelectedChunk] = useState(null)
  const documentCount = new Set((chunks || []).map(chunk => chunk.documentId)).size
  const filteredChunks = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return chunks || []

    return (chunks || []).filter(chunk => [
      chunk.title,
      chunk.vectorKey,
      chunk.content,
      chunk.metadata ? JSON.stringify(chunk.metadata) : ''
    ].some(value => String(value || '').toLowerCase().includes(needle)))
  }, [chunks, query])

  if (!chunks || chunks.length === 0) {
    return (
      <Paper sx={{ p: 2, border: 1, borderColor: 'divider' }}>
        <EmptyState
          icon={<TravelExploreIcon sx={{ fontSize: 48, mb: 2 }} />}
          title="No indexed chunks"
          message="Ingest documents to inspect chunks here"
        />
      </Paper>
    )
  }

  return (
    <>
      <TableContainer component={Paper} sx={{ overflowX: 'auto', border: 1, borderColor: 'divider' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ p: 2 }} alignItems={{ md: 'center' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">Explorer</Typography>
            <Typography variant="body2" color="text.secondary">
              {filteredChunks.length} of {chunks.length} chunks from {documentCount} documents
            </Typography>
          </Box>
          <TextField
            size="small"
            label="Filter chunks"
            value={query}
            onChange={event => setQuery(event.target.value)}
            sx={{ width: { xs: '100%', md: 320 } }}
            InputProps={{
              startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Document</TableCell>
              <TableCell>Vector key</TableCell>
              <TableCell>Chunk</TableCell>
              <TableCell>Tokens</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredChunks.map(chunk => (
              <TableRow
                key={chunk.id}
                hover
                onClick={() => setSelectedChunk(chunk)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>
                  <Stack spacing={0.5}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{chunk.title}</Typography>
                    <Typography variant="caption" color="text.secondary">Chunk {chunk.chunkIndex}</Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip size="small" label={chunk.vectorKey} variant="outlined" sx={{ maxWidth: 180 }} />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 460 }}>
                    {chunk.content}
                  </Typography>
                </TableCell>
                <TableCell>{chunk.tokenCount}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <IconButton
                      size="small"
                      aria-label="Copy vector key"
                      onClick={event => {
                        event.stopPropagation()
                        copyText(chunk.vectorKey)
                      }}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                    <Button size="small" variant="outlined" onClick={event => {
                      event.stopPropagation()
                      setSelectedChunk(chunk)
                    }}>
                      Inspect
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filteredChunks.length === 0 && (
          <Typography color="text.secondary" sx={{ p: 2 }}>No chunks match this filter</Typography>
        )}
      </TableContainer>
      <ChunkInspectorDrawer
        chunk={selectedChunk}
        open={Boolean(selectedChunk)}
        onClose={() => setSelectedChunk(null)}
      />
    </>
  )
}
