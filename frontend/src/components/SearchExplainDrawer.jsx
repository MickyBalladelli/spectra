import { Box, Chip, Divider, Drawer, Stack, Typography } from '@mui/material'

function formatJson(value) {
  return JSON.stringify(value || {}, null, 2)
}

function getFilterRows(context) {
  return [
    ['Collection', context.collectionName || 'All my documents'],
    ['Source', context.searchFilters?.sourceType || 'Any source'],
    ['Document', context.documentTitle || 'Any document'],
    ['From', context.dateFrom || 'Any date'],
    ['To', context.dateTo || 'Any date']
  ]
}

export function SearchExplainDrawer({ result, context, open, onClose }) {
  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: '100vw', sm: 520 }, p: 2 }}>
        {result ? (
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6">{result.title}</Typography>
              <Typography variant="body2" color="text.secondary">Search explain</Typography>
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip size="small" label={`combined ${result.score}`} color="success" />
              <Chip size="small" label={`keyword ${result.textScore ?? 0}`} variant="outlined" />
              <Chip size="small" label={`vector ${result.vectorScore ?? 0}`} variant="outlined" />
              <Chip size="small" label={result.confidence || 'low'} variant="outlined" />
            </Stack>

            <Divider />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Query</Typography>
              <Stack spacing={0.5}>
                <Typography variant="body2">Original: {context.query}</Typography>
                <Typography variant="body2">Searched: {context.normalizedQuery || context.query}</Typography>
                <Typography variant="body2" color="text.secondary">Latency: {context.latency ?? 0}ms</Typography>
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Filters</Typography>
              <Stack spacing={0.5}>
                {getFilterRows(context).map(([label, value]) => (
                  <Typography key={label} variant="body2">
                    {label}: {value}
                  </Typography>
                ))}
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Metadata filter</Typography>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 1.25,
                  bgcolor: 'background.default',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  fontSize: 13,
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'anywhere'
                }}
              >
                {formatJson(context.filter)}
              </Box>
            </Box>
          </Stack>
        ) : (
          <Typography color="text.secondary">No result selected</Typography>
        )}
      </Box>
    </Drawer>
  )
}
