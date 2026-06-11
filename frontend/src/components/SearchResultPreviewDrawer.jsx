import { Drawer, Box, Chip, Divider, Stack, Typography } from '@mui/material'
import { HighlightedText } from './HighlightedText.jsx'

export function SearchResultPreviewDrawer({ result, query, open, onClose }) {
  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: '100vw', sm: 560 }, p: 2 }}>
        {result ? (
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6">{result.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                Search result preview
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip size="small" label={result.confidence || 'low'} color={result.confidence === 'high' ? 'success' : result.confidence === 'medium' ? 'primary' : 'warning'} variant="outlined" />
              <Chip size="small" label={result.score} />
              {result.metadata?.sourceType && <Chip size="small" label={result.metadata.sourceType} variant="outlined" />}
            </Stack>
            <Divider />
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              <HighlightedText text={result.content} query={query} />
            </Typography>
          </Stack>
        ) : (
          <Typography color="text.secondary">No result selected</Typography>
        )}
      </Box>
    </Drawer>
  )
}
