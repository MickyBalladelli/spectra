import {
  Box,
  Card,
  CardActions,
  CardContent,
  List,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material'
import DescriptionIcon from '@mui/icons-material/Description'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import LanguageIcon from '@mui/icons-material/Language'
import { formatDistanceToNow } from 'date-fns'
import { DocumentRemoveButton } from './DocumentRemoveButton.jsx'

export function DocumentList({ documents, onDocumentRemoved }) {
  const viewMode = 'list'

  if (!documents || documents.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
        <DescriptionIcon sx={{ fontSize: 48, mb: 2 }} />
        <Typography variant="h6">No documents ingested yet</Typography>
        <Typography>Ingest your first document to get started</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Ingested Documents ({documents.length})</Typography>
      </Box>

      {viewMode === 'list' ? (
        <List>
          {documents.map((doc) => {
            const SourceIcon = doc.sourceType === 'url' ? LanguageIcon : InsertDriveFileIcon
            return (
              <Card key={doc.id} sx={{ mb: 2, boxShadow: 1 }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <SourceIcon color="primary" />
                    <Typography variant="subtitle1" sx={{ ml: 1, fontWeight: 'medium' }}>
                      {doc.title}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Source:
                    </Typography>
                    <Typography variant="body2" sx={{ ml: 1, fontWeight: 'medium' }}>
                      {doc.sourceType}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Ingested {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', p: 1 }}>
                  <DocumentRemoveButton
                    documentId={doc.id}
                    onRemoved={onDocumentRemoved}
                  />
                </CardActions>
              </Card>
            )
          })}
        </List>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Source Type</TableCell>
                <TableCell>Ingested</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id} hover>
                  <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {doc.title}
                  </TableCell>
                  <TableCell>{doc.sourceType}</TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell align="right">
                    <DocumentRemoveButton
                      documentId={doc.id}
                      iconOnly
                      onRemoved={onDocumentRemoved}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}
