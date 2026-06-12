import { Box, Button, Chip, Divider, Drawer, Stack, Typography } from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'

function copyText(value) {
  navigator.clipboard?.writeText(String(value || '')).catch(() => {})
}

export function ChunkInspectorDrawer({ chunk, open, onClose }) {
  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: '100vw', sm: 560 }, p: 2 }}>
        {chunk ? (
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6">{chunk.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                Chunk {chunk.chunkIndex}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip size="small" label={`${chunk.tokenCount || 0} tokens`} />
              <Chip size="small" label={chunk.vectorKey} variant="outlined" />
            </Stack>

            <Stack direction="row" spacing={1}>
              <Button startIcon={<ContentCopyIcon />} variant="outlined" onClick={() => copyText(chunk.vectorKey)}>
                Copy key
              </Button>
              <Button startIcon={<ContentCopyIcon />} variant="outlined" onClick={() => copyText(chunk.content)}>
                Copy text
              </Button>
            </Stack>

            <Divider />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Content</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                {chunk.content}
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Metadata</Typography>
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
                {JSON.stringify(chunk.metadata || {}, null, 2)}
              </Box>
            </Box>
          </Stack>
        ) : (
          <Typography color="text.secondary">No chunk selected</Typography>
        )}
      </Box>
    </Drawer>
  )
}
