import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material'

export function DataExplorer({ chunks }) {
  const documentCount = new Set((chunks || []).map(chunk => chunk.documentId)).size

  if (!chunks || chunks.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary">No indexed chunks available.</Typography>
      </Paper>
    )
  }

  return (
    <TableContainer component={Paper} sx={{ overflowX: 'auto', border: 1, borderColor: 'divider' }}>
      <Typography variant="h6" sx={{ p: 2, pb: 0 }}>
        Explorer
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ px: 2, pb: 2 }}>
        {chunks.length} chunks from {documentCount} documents
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Document</TableCell>
            <TableCell>Vector key</TableCell>
            <TableCell>Chunk</TableCell>
            <TableCell>Tokens</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {chunks.map(chunk => (
            <TableRow key={chunk.id}>
              <TableCell>{chunk.title}</TableCell>
              <TableCell>{chunk.vectorKey}</TableCell>
              <TableCell>
                <Typography variant="body2" noWrap sx={{ maxWidth: 460 }}>
                  {chunk.content}
                </Typography>
              </TableCell>
              <TableCell>{chunk.tokenCount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
