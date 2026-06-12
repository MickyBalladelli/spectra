import { useEffect, useRef, useState } from 'react'
import { Box, Button, Chip, FormControl, FormControlLabel, Grid, InputLabel, MenuItem, Paper, Select, Stack, Switch, TextField, Typography, Skeleton } from '@mui/material'
import InfoIcon from '@mui/icons-material/Info'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { HighlightedText } from './HighlightedText.jsx'
import { getAuthToken } from '../userSession.js'
import { EmptyState } from './EmptyState.jsx'
import { SearchResultPreviewDrawer } from './SearchResultPreviewDrawer.jsx'
import { apiPost } from '../api/client.js'
import { SearchFeedbackButtons } from './SearchFeedbackButtons.jsx'
import { SearchExplainDrawer } from './SearchExplainDrawer.jsx'
import { SavedSearchesPanel } from './SavedSearchesPanel.jsx'

const filterExamples = [
  {
    label: 'PDFs',
    value: '{\n  "sourceType": "pdf"\n}'
  },
  {
    label: 'Pasted text',
    value: '{\n  "sourceType": "paste"\n}'
  },
  {
    label: 'Files',
    value: '{\n  "sourceType": "file"\n}'
  }
]

function getConfidenceColor(confidence) {
  if (confidence === 'high') return 'success'
  if (confidence === 'medium') return 'primary'
  return 'warning'
}

export function SearchView({ socket, collections = [], documents = [] }) {
  const [query, setQuery] = useState('Find vector compression notes')
  const [useFilter, setUseFilter] = useState(false)
  const [filter, setFilter] = useState('{\n  "sourceType": "pdf"\n}')
  const [filterError, setFilterError] = useState('')
  const [latency, setLatency] = useState(null)
  const [results, setResults] = useState([])
  const [queryAuditId, setQueryAuditId] = useState(null)
  const [feedback, setFeedback] = useState({})
  const [normalizedQuery, setNormalizedQuery] = useState('')
  const [collectionId, setCollectionId] = useState('')
  const [sourceType, setSourceType] = useState('')
  const [documentId, setDocumentId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [previewResult, setPreviewResult] = useState(null)
  const [explainResult, setExplainResult] = useState(null)
  const [searchContext, setSearchContext] = useState({})
  const inputRef = useRef(null)
  const isSignedIn = Boolean(getAuthToken())

  useEffect(() => {
    const handleResults = payload => {
      setLatency(payload.latencyMs)
      setResults(payload.results)
      setQueryAuditId(payload.queryAuditId || null)
      setFeedback({})
      setNormalizedQuery(payload.normalizedQuery || '')
      setSearchContext(current => ({
        ...current,
        latency: payload.latencyMs,
        normalizedQuery: payload.normalizedQuery || ''
      }))
      setSearchError('')
      setLoading(false)
    }

    const handleError = payload => {
      setSearchError(payload?.message || 'Search failed')
      setLoading(false)
    }

    socket.on('query:results', handleResults)
    socket.on('query:error', handleError)

    return () => {
      socket.off('query:results', handleResults)
      socket.off('query:error', handleError)
    }
  }, [socket])

  useEffect(() => {
    const handleKeyDown = event => {
      if (event.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        event.preventDefault()
        inputRef.current?.focus()
      }

      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault()
        execute()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  })

  function execute() {
    if (!isSignedIn) {
      setSearchError('Sign in to search documents')
      return
    }

    let parsedFilter = {}
    setFilterError('')
    setLoading(true)

    if (useFilter) {
      try {
        parsedFilter = JSON.parse(filter || '{}')
      } catch {
        setFilterError('Filter must be valid JSON')
        setLoading(false)
        return
      }
    }

    const searchFilters = {
      ...(sourceType ? { sourceType } : {}),
      ...(documentId ? { documentId } : {}),
      ...(dateFrom ? { dateFrom: `${dateFrom}T00:00:00.000Z` } : {}),
      ...(dateTo ? { dateTo: `${dateTo}T23:59:59.999Z` } : {})
    }
    const selectedCollection = collections.find(collection => collection.id === collectionId)
    const selectedDocument = documents.find(document => document.id === documentId)

    setSearchContext({
      query,
      filter: parsedFilter,
      searchFilters,
      collectionName: selectedCollection?.name || '',
      documentTitle: selectedDocument?.title || '',
      dateFrom,
      dateTo,
      latency: null,
      normalizedQuery: ''
    })

    socket.emit('query:execute', {
      query,
      collectionId: collectionId || null,
      searchFilters,
      filter: parsedFilter,
      topK: 5
    })
  }

  function getCurrentSearchConfig() {
    let parsedFilter = {}

    if (useFilter) {
      try {
        parsedFilter = JSON.parse(filter || '{}')
      } catch {
        parsedFilter = {}
      }
    }

    return {
      query,
      useFilter,
      filter: parsedFilter,
      collectionId,
      sourceType,
      documentId,
      dateFrom,
      dateTo
    }
  }

  function loadSavedSearch(config) {
    setQuery(config.query || '')
    setUseFilter(Boolean(config.useFilter))
    setFilter(JSON.stringify(config.filter || {}, null, 2))
    setCollectionId(config.collectionId || '')
    setSourceType(config.sourceType || '')
    setDocumentId(config.documentId || '')
    setDateFrom(config.dateFrom || '')
    setDateTo(config.dateTo || '')
    setFilterError('')
  }

  async function rateResult(result, rating) {
    if (!queryAuditId) return

    setFeedback(current => ({
      ...current,
      [result.id]: rating
    }))

    try {
      await apiPost('/api/query/feedback', {
        queryAuditId,
        chunkId: result.id,
        rating
      })
    } catch {
      setFeedback(current => ({
        ...current,
        [result.id]: ''
      }))
    }
  }

  const sourceTypes = Array.from(new Set(documents.map(document => document.sourceType).filter(Boolean))).sort()

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={5}>
        <Paper sx={{ p: 2, height: '100%', border: 1, borderColor: 'divider' }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6">Search</Typography>
              <Typography variant="body2" color="text.secondary">
                Words find meaning. Filter narrows metadata.
              </Typography>
            </Box>
            <SavedSearchesPanel
              config={getCurrentSearchConfig()}
              onLoad={loadSavedSearch}
              disabled={!isSignedIn}
            />
            <TextField
              inputRef={inputRef}
              label="Search text"
              value={query}
              onChange={event => setQuery(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  execute()
                }
              }}
              helperText="Used for semantic vector search"
              inputProps={{ 'aria-label': 'Search text' }}
              fullWidth
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Collection</InputLabel>
              <Select label="Collection" value={collectionId} onChange={event => setCollectionId(event.target.value)}>
                <MenuItem value="">All my documents</MenuItem>
                {collections.map(collection => (
                  <MenuItem key={collection.id} value={collection.id}>
                    {collection.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Source</InputLabel>
                <Select label="Source" value={sourceType} onChange={event => setSourceType(event.target.value)}>
                  <MenuItem value="">Any source</MenuItem>
                  {sourceTypes.map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Document</InputLabel>
                <Select label="Document" value={documentId} onChange={event => setDocumentId(event.target.value)}>
                  <MenuItem value="">Any document</MenuItem>
                  {documents.map(document => (
                    <MenuItem key={document.id} value={document.id}>{document.title}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField
                size="small"
                label="From"
                type="date"
                value={dateFrom}
                onChange={event => setDateFrom(event.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="To"
                type="date"
                value={dateTo}
                onChange={event => setDateTo(event.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
              />
            </Stack>
            <FormControlLabel
              control={<Switch checked={useFilter} onChange={event => setUseFilter(event.target.checked)} />}
              label="Use metadata filter"
            />
            {useFilter && (
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {filterExamples.map(example => (
                    <Button
                      key={example.label}
                      size="small"
                      variant="outlined"
                      onClick={() => setFilter(example.value)}
                    >
                      {example.label}
                    </Button>
                  ))}
                </Stack>
                <TextField
                  label="Metadata JSON"
                  value={filter}
                  onChange={event => setFilter(event.target.value)}
                  error={Boolean(filterError)}
                  helperText={filterError || 'Examples use sourceType: pdf, paste, file'}
                  multiline
                  minRows={6}
                  fullWidth
                />
              </Stack>
            )}
            <Button
              startIcon={<PlayArrowIcon />}
              variant="contained"
              onClick={execute}
              disabled={loading || !query || Boolean(filterError) || !isSignedIn}
              aria-label="Execute search"
            >
              {loading ? 'Searching…' : 'Search'}
            </Button>
          </Stack>
        </Paper>
      </Grid>
      <Grid item xs={12} md={7}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Results</Typography>
            <Stack direction="row" spacing={1}>
              {normalizedQuery && normalizedQuery !== query.trim() && <Chip size="small" label={`searched: ${normalizedQuery}`} />}
              {latency !== null && <Chip size="small" label={`${latency}ms`} />}
              {results.length > 0 && <Chip size="small" label={`${results.length} hits`} color="primary" variant="outlined" />}
            </Stack>
          </Stack>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Paper key={i} sx={{ p: 2 }}>
                <Stack spacing={1}>
                  <Skeleton width="60%" />
                  <Skeleton width="30%" />
                  <Skeleton variant="text" />
                </Stack>
              </Paper>
            ))
          ) : searchError ? (
            <Box sx={{ p: 3, color: 'error.main' }}>{searchError}</Box>
          ) : results.length > 0 ? (
            results.map(result => (
              <Paper
                key={result.id}
                onClick={() => setPreviewResult(result)}
                sx={{
                  p: 2,
                  border: 1,
                  borderColor: 'divider',
                  cursor: 'pointer'
                }}
              >
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" gap={2}>
                    <Typography variant="subtitle2">{result.title}</Typography>
                    <Stack direction="row" spacing={1}>
                      <SearchFeedbackButtons
                        value={feedback[result.id]}
                        onChange={rating => rateResult(result, rating)}
                      />
                      <Button
                        size="small"
                        startIcon={<InfoIcon />}
                        variant="outlined"
                        onClick={event => {
                          event.stopPropagation()
                          setExplainResult(result)
                        }}
                      >
                        Explain
                      </Button>
                      <Chip size="small" color={getConfidenceColor(result.confidence)} variant="outlined" label={result.confidence || 'low'} />
                      <Chip size="small" color="success" variant="outlined" label={result.score} />
                      <Chip size="small" variant="outlined" label={`kw ${result.textScore ?? 0}`} />
                      <Chip size="small" variant="outlined" label={`vec ${result.vectorScore ?? 0}`} />
                    </Stack>
                  </Stack>
                  <Typography color="text.secondary">
                    <HighlightedText text={result.content} query={normalizedQuery || query} />
                  </Typography>
                </Stack>
              </Paper>
            ))
          ) : (
            <EmptyState
              title="No confident results yet"
              message="Search documents or adjust filters"
            />
          )}
        </Stack>
      </Grid>
      <SearchResultPreviewDrawer
        result={previewResult}
        query={normalizedQuery || query}
        open={Boolean(previewResult)}
        onClose={() => setPreviewResult(null)}
      />
      <SearchExplainDrawer
        result={explainResult}
        context={searchContext}
        open={Boolean(explainResult)}
        onClose={() => setExplainResult(null)}
      />
    </Grid>
  )
}
