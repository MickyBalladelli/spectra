import { useRef, useState } from 'react'
import { Box, Button, Stack, TextField, Typography } from '@mui/material'
import ContentPasteIcon from '@mui/icons-material/ContentPaste'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'

const acceptedFileTypes = '.txt,.md,.markdown,.json,.csv,.pdf,application/pdf'

function isPdf(file) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

function formatBytes(value) {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentInputZone({ title, text, files = [], onTitleChange, onTextChange, onSourceTypeChange, onFilesChange }) {
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')

  function clearFiles() {
    onFilesChange?.([])
  }

  function useFiles(nextFiles) {
    const fileList = Array.from(nextFiles || [])
    if (fileList.length === 0) return

    setError('')

    onFilesChange?.(fileList)
    onTitleChange(fileList.length === 1 ? fileList[0].name : `${fileList.length} files`)
    onTextChange('')
    onSourceTypeChange('file-upload')
  }

  function handleDrop(event) {
    event.preventDefault()
    setIsDragging(false)
    useFiles(event.dataTransfer.files)
  }

  function handlePaste(event) {
    const pastedText = event.clipboardData.getData('text')
    if (!pastedText) return

    clearFiles()
    onTextChange(pastedText)
    onSourceTypeChange('paste')

    if (!title) {
      onTitleChange('Pasted document')
    }
  }

  function openFilePicker() {
    inputRef.current?.click()
  }

  return (
    <Stack spacing={2}>
      <Box
        role="region"
        aria-label="Document dropzone"
        aria-busy={false}
        onDragEnter={event => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragOver={event => event.preventDefault()}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onPaste={handlePaste}
        tabIndex={0}
        sx={{
          border: 1,
          borderStyle: 'dashed',
          borderColor: isDragging ? 'primary.main' : 'divider',
          bgcolor: isDragging ? 'action.hover' : 'background.default',
          p: 3,
          outline: 'none',
          transition: theme => theme.transitions.create(['border-color', 'background-color']),
          '&:focusVisible': {
            boxShadow: theme => `0 0 0 4px ${theme.palette.primary.main}22`
          }
        }}
      >
        <Stack spacing={2} alignItems="center" textAlign="center">
          <FileUploadIcon color="primary" />
          <Box>
            <Typography variant="subtitle1">Drop files here</Typography>
            <Typography variant="body2" color="text.secondary">
              Paste text here or browse text, Markdown, JSON, CSV, or PDF files
            </Typography>
          </Box>
          <Button startIcon={<FolderOpenIcon />} variant="outlined" onClick={openFilePicker}>
            Browse files
          </Button>
          <input
            ref={inputRef}
            hidden
            multiple
            type="file"
            accept={acceptedFileTypes}
            onChange={event => {
              useFiles(event.target.files)
              event.target.value = ''
            }}
          />
          {error && (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          )}
          {files.length > 0 && (
            <Box sx={{ width: '100%', maxWidth: 560, textAlign: 'left' }}>
              {files.map(file => (
                <Typography key={`${file.name}-${file.size}`} variant="body2" color="text.secondary">
                  {file.name} - {formatBytes(file.size)}
                </Typography>
              ))}
            </Box>
          )}
        </Stack>
      </Box>

      <TextField
        label="Title"
        value={title}
        onChange={event => {
          clearFiles()
          onTitleChange(event.target.value)
        }}
      />
      <TextField
        label="Raw text or Markdown"
        value={text}
        onChange={event => {
          clearFiles()
          onTextChange(event.target.value)
          onSourceTypeChange('raw')
        }}
        onPaste={handlePaste}
        multiline
        minRows={8}
        maxRows={12}
        sx={{
          '& textarea': {
            overflow: 'auto'
          }
        }}
      />

      <Button startIcon={<ContentPasteIcon />} variant="text" onClick={() => navigator.clipboard.readText().then(value => {
        if (!value) return
        clearFiles()
        onTextChange(value)
        onSourceTypeChange('paste')
      }).catch(() => {})}>
        Paste from clipboard
      </Button>
    </Stack>
  )
}
