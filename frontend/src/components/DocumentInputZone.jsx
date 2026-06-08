import { useRef, useState } from 'react'
import { Box, Button, Stack, TextField, Typography } from '@mui/material'
import ContentPasteIcon from '@mui/icons-material/ContentPaste'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const acceptedFileTypes = '.txt,.md,.markdown,.json,.csv,.pdf,application/pdf'

function isPdf(file) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

async function readPdf(file) {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise
  const pages = []
  let pageNumber = 1

  while (pageNumber <= pdf.numPages) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const text = content.items
      .map(item => item.str)
      .filter(Boolean)
      .join(' ')

    pages.push(text)
    pageNumber += 1
  }

  return pages.join('\n\n')
}

async function readFile(file) {
  if (isPdf(file)) return readPdf(file)

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

export function DocumentInputZone({ title, text, onTitleChange, onTextChange, onSourceTypeChange, onDocumentsChange }) {
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isReading, setIsReading] = useState(false)
  const [error, setError] = useState('')

  function clearBatchDocuments() {
    onDocumentsChange?.([])
  }

  async function useFiles(files) {
    const fileList = Array.from(files || [])
    if (fileList.length === 0) return

    setIsReading(true)
    setError('')

    try {
      const chunks = await Promise.all(fileList.map(readFile))
      const names = fileList.map(file => file.name)
      const hasPdf = fileList.some(isPdf)
      const documents = fileList.map((file, index) => ({
        title: file.name,
        text: chunks[index],
        sourceType: isPdf(file) ? 'pdf' : 'file',
        metadata: { sourceFileName: file.name }
      }))

      if (documents.length > 1) {
        onDocumentsChange?.(documents)
        onTitleChange(`${documents.length} files`)
        onTextChange(chunks.join('\n\n---\n\n'))
        onSourceTypeChange('batch')
      } else {
        onDocumentsChange?.([])
        onTitleChange(names[0])
        onTextChange(chunks[0])
        onSourceTypeChange(hasPdf ? 'pdf' : 'file')
      }
    } catch {
      setError('Could not read file')
      onDocumentsChange?.([])
    } finally {
      setIsReading(false)
    }
  }

  function handleDrop(event) {
    event.preventDefault()
    setIsDragging(false)
    useFiles(event.dataTransfer.files)
  }

  function handlePaste(event) {
    const pastedText = event.clipboardData.getData('text')
    if (!pastedText) return

    clearBatchDocuments()
    onTextChange(pastedText)
    onSourceTypeChange('paste')

    if (!title || title === 'Demo document') {
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
        aria-busy={isReading}
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
          <Button startIcon={<FolderOpenIcon />} variant="outlined" onClick={openFilePicker} disabled={isReading}>
            {isReading ? 'Reading files' : 'Browse files'}
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
        </Stack>
      </Box>

      <TextField
        label="Title"
        value={title}
        onChange={event => {
          clearBatchDocuments()
          onTitleChange(event.target.value)
        }}
      />
      <TextField
        label="Raw text or Markdown"
        value={text}
        onChange={event => {
          clearBatchDocuments()
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
        onTextChange(value)
        onSourceTypeChange('paste')
      }).catch(() => {})}>
        Paste from clipboard
      </Button>
    </Stack>
  )
}
