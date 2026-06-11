import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import KeyIcon from '@mui/icons-material/Key'
import SearchIcon from '@mui/icons-material/Search'
import SegmentIcon from '@mui/icons-material/Segment'
import StorageIcon from '@mui/icons-material/Storage'
import { apiGet } from '../api/client.js'
import { HighlightedText } from './HighlightedText.jsx'
import { EmptyState } from './EmptyState.jsx'

function formatDate(value) {
  if (!value) return 'Unknown'
  return new Date(value).toLocaleString()
}

function getTerms(query) {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(term => term.replace(/[^\p{L}\p{N}_-]/gu, ''))
    .filter(term => term.length > 1)
}

function countHits(text, terms) {
  const value = String(text || '').toLowerCase()

  return terms.reduce((total, term) => {
    const matches = value.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))
    return total + (matches?.length || 0)
  }, 0)
}

export function DocumentDetailPage({ documentId, onBack }) {
  const [document, setDocument] = useState(null)
  const [chunks, setChunks] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!documentId) return

    let alive = true
    setLoading(true)
    setError('')

    Promise.all([
      apiGet(`/api/indexes/documents/${documentId}`),
      apiGet(`/api/indexes/documents/${documentId}/chunks`)
    ])
      .then(([nextDocument, nextChunks]) => {
        if (!alive) return
        setDocument(nextDocument)
        setChunks(nextChunks)
      })
      .catch(fetchError => {
        if (!alive) return
        setError(fetchError.message || 'Could not load document')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [documentId])

  const terms = useMemo(() => getTerms(query), [query])
  const matchedChunks = useMemo(() => {
    if (terms.length === 0) return chunks

    return chunks
      .map(chunk => ({
        ...chunk,
        hitCount: countHits(chunk.content, terms)
      }))
      .filter(chunk => chunk.hitCount > 0)
      .sort((left, right) => right.hitCount - left.hitCount || left.chunkIndex - right.chunkIndex)
  }, [chunks, terms])

  const vectorKeys = useMemo(() => chunks.map(chunk => chunk.vectorKey).filter(Boolean), [chunks])
  const totalHits = useMemo(() => matchedChunks.reduce((total, chunk) => total + (chunk.hitCount || 0), 0), [matchedChunks])

  if (!documentId) {
    return (
      <EmptyState
        icon={<StorageIcon sx={{ fontSize: 48, mb: 2 }} />}
        title="No document selected"
        message="Pick a document to see details"
      />
    )
  }

  if (loading) {
    return (
      <Paper sx={{ p: 4, border: 1, borderColor: 'divider', textAlign: 'center' }}>
        <CircularProgress size={28} />
        <Typography sx={{ mt: 2 }} color="text.secondary">Loading document</Typography>
      </Paper>
    )
  }

  if (error) {
    return (
      <Stack spacing={2}>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ alignSelf: 'flex-start' }}>
          Back
        </Button>
        <Alert severity="error">{error}</Alert>
      </Stack>
    )
  }

  if (!document) return null

  return (
    <Stack spacing={2.5}>
      <Paper sx={{ p: 2, border: 1, borderColor: 'divider' }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
            <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}>
              Back
            </Button>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="h5" sx={{ overflowWrap: 'anywhere' }}>
                {document.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {document.sourceType} - {formatDate(document.createdAt)}
              </Typography>
            </Box>
            <Chip label={`${chunks.length} chunks`} color="primary" variant="outlined" />
            <Chip label={`${vectorKeys.length} vector keys`} variant="outlined" />
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
              gap: 1.5
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">Document ID</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', overflowWrap: 'anywhere' }}>
                {document.id}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Source</Typography>
              <Typography variant="body2">{document.sourceType}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Characters</Typography>
              <Typography variant="body2">{String(document.body || '').length.toLocaleString()}</Typography>
            </Box>
          </Box>
        </Stack>
      </Paper>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2fr) minmax(320px, 1fr)' },
          gap: 2
        }}
      >
        <Stack spacing={2}>
          <Paper sx={{ p: 2, border: 1, borderColor: 'divider' }}>
            <Stack spacing={1.5}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6">Search hits inside document</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {terms.length > 0 ? `${totalHits} hits in ${matchedChunks.length} chunks` : 'Type words to filter chunks'}
                  </Typography>
                </Box>
                <TextField
                  size="small"
                  label="Search in document"
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  sx={{ width: { xs: '100%', sm: 320 } }}
                  InputProps={{
                    startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Stack>

              <Stack sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                {matchedChunks.map((chunk, index) => (
                  <Box
                    key={chunk.id}
                    sx={{
                      p: 1.5,
                      borderTop: index === 0 ? 0 : 1,
                      borderColor: 'divider',
                      bgcolor: index % 2 === 0 ? 'background.default' : 'background.paper'
                    }}
                  >
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ mb: 1 }}>
                      <Chip icon={<SegmentIcon />} size="small" label={`Chunk ${chunk.chunkIndex}`} />
                      <Chip size="small" label={`${chunk.tokenCount || 0} tokens`} variant="outlined" />
                      {chunk.hitCount > 0 && <Chip size="small" color="warning" label={`${chunk.hitCount} hits`} />}
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', overflowWrap: 'anywhere' }}>
                        {chunk.vectorKey}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
                      <HighlightedText text={chunk.content} query={query} />
                    </Typography>
                  </Box>
                ))}
                {matchedChunks.length === 0 && (
                  <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                    No chunk matches this search
                  </Box>
                )}
              </Stack>
            </Stack>
          </Paper>
        </Stack>

        <Stack spacing={2}>
          <Paper sx={{ p: 2, border: 1, borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Metadata</Typography>
            <Box
              component="pre"
              sx={{
                m: 0,
                p: 1.5,
                bgcolor: 'background.default',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                fontSize: 13,
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere'
              }}
            >
              {JSON.stringify(document.metadata || {}, null, 2)}
            </Box>
          </Paper>

          <Paper sx={{ p: 2, border: 1, borderColor: 'divider' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <KeyIcon color="primary" />
              <Typography variant="h6">Vector keys</Typography>
            </Stack>
            <Divider sx={{ mb: 1.5 }} />
            <Stack spacing={1} sx={{ maxHeight: 360, overflow: 'auto' }}>
              {vectorKeys.map(vectorKey => (
                <Typography
                  key={vectorKey}
                  variant="caption"
                  sx={{
                    fontFamily: 'monospace',
                    bgcolor: 'background.default',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 1,
                    overflowWrap: 'anywhere'
                  }}
                >
                  {vectorKey}
                </Typography>
              ))}
              {vectorKeys.length === 0 && (
                <Typography variant="body2" color="text.secondary">No vector keys found</Typography>
              )}
            </Stack>
          </Paper>
        </Stack>
      </Box>
    </Stack>
  )
}
