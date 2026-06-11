import { useEffect, useState } from 'react'
import { Box, Button, Chip, FormControlLabel, Grid, Paper, Stack, Switch, TextField, Typography, Skeleton } from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { HighlightedText } from './HighlightedText.jsx'

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

export function SearchView({ socket }) {
  const [query, setQuery] = useState('Find vector compression notes')
  const [useFilter, setUseFilter] = useState(false)
  const [filter, setFilter] = useState('{\n  "sourceType": "pdf"\n}')
  const [filterError, setFilterError] = useState('')
  const [latency, setLatency] = useState(null)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState('')

  useEffect(() => {
    const handleResults = payload => {
      setLatency(payload.latencyMs)
      setResults(payload.results)
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

  function execute() {
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

    socket.emit('query:execute', {
      query,
      filter: parsedFilter,
      topK: 5
    })
  }

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
            <TextField
              label="Search text"
              value={query}
              onChange={event => setQuery(event.target.value)}
              onKeyPress={event => {
                if (event.key === 'Enter') {
                  execute()
                }
              }}
              helperText="Used for semantic vector search"
              inputProps={{ 'aria-label': 'Search text' }}
              fullWidth
            />
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
              disabled={loading || !query || Boolean(filterError)}
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
                sx={{
                  p: 2,
                  border: 1,
                  borderColor: 'divider'
                }}
              >
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" gap={2}>
                    <Typography variant="subtitle2">{result.title}</Typography>
                    <Chip size="small" color="success" variant="outlined" label={result.score} />
                  </Stack>
                  <Typography color="text.secondary">
                    <HighlightedText text={result.content} query={query} />
                  </Typography>
                </Stack>
              </Paper>
            ))
          ) : (
            <Box sx={{ p: 3, color: 'text.secondary' }}>No results yet. Try search.</Box>
          )}
        </Stack>
      </Grid>
    </Grid>
  )
}
