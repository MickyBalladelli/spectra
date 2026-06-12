import { Box, Chip, Paper, Stack, Typography } from '@mui/material'
import ArticleIcon from '@mui/icons-material/Article'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import TableChartIcon from '@mui/icons-material/TableChart'

const textExtensions = new Set(['.txt', '.md', '.markdown', '.json', '.csv'])

function getExtension(name) {
  const match = name.toLowerCase().match(/\.[^.]+$/)
  return match ? match[0] : ''
}

function getFileKind(file) {
  const extension = getExtension(file.name)
  if (file.type === 'application/pdf' || extension === '.pdf') return 'PDF'
  if (extension === '.csv') return 'CSV'
  if (extension === '.json') return 'JSON'
  if (extension === '.md' || extension === '.markdown') return 'Markdown'
  if (extension === '.txt') return 'Text'
  return extension ? extension.slice(1).toUpperCase() : 'Unknown'
}

function isSupported(file) {
  const extension = getExtension(file.name)
  return file.type === 'application/pdf' || extension === '.pdf' || textExtensions.has(extension)
}

function formatBytes(value) {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

function getIcon(kind) {
  if (kind === 'PDF') return <PictureAsPdfIcon fontSize="small" />
  if (kind === 'CSV' || kind === 'JSON') return <TableChartIcon fontSize="small" />
  return <ArticleIcon fontSize="small" />
}

export function FileTypePreview({ files }) {
  if (!files?.length) return null

  const names = new Map()
  files.forEach(file => {
    names.set(file.name, (names.get(file.name) || 0) + 1)
  })

  return (
    <Paper variant="outlined" sx={{ width: '100%', maxWidth: 680, overflow: 'hidden' }}>
      {files.map((file, index) => {
        const kind = getFileKind(file)
        const supported = isSupported(file)
        const duplicateName = names.get(file.name) > 1

        return (
          <Box
            key={`${file.name}-${file.size}-${index}`}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) 110px 120px' },
              gap: 1,
              alignItems: 'center',
              p: 1.25,
              borderTop: index === 0 ? 0 : 1,
              borderColor: 'divider',
              textAlign: 'left'
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
              {getIcon(kind)}
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {file.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatBytes(file.size)}{file.type ? ` - ${file.type}` : ''}
                </Typography>
              </Box>
            </Stack>
            <Chip size="small" label={kind} variant="outlined" />
            <Stack direction="row" spacing={0.5}>
              <Chip size="small" label={supported ? 'supported' : 'unsupported'} color={supported ? 'success' : 'error'} />
              {duplicateName && <Chip size="small" label="same name" color="warning" />}
            </Stack>
          </Box>
        )
      })}
    </Paper>
  )
}
