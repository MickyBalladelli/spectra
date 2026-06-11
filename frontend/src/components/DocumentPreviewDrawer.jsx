import { Drawer, Box, Chip, Divider, Stack, Typography } from '@mui/material'
import { formatDistanceToNow } from 'date-fns'

export function DocumentPreviewDrawer({ document, open, onClose }) {
  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: '100vw', sm: 520 }, p: 2 }}>
        {document ? (
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6">{document.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {formatDistanceToNow(new Date(document.createdAt), { addSuffix: true })}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip size="small" label={document.sourceType} variant="outlined" />
              {document.metadata?.sourceFileName && <Chip size="small" label={document.metadata.sourceFileName} />}
            </Stack>
            <Divider />
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              {document.body || 'No preview available'}
            </Typography>
          </Stack>
        ) : (
          <Typography color="text.secondary">Loading preview</Typography>
        )}
      </Box>
    </Drawer>
  )
}
