import { createRequire } from 'module'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { createCanvas } from '@napi-rs/canvas'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { createWorker } from 'tesseract.js'

const textExtensions = new Set(['.txt', '.md', '.markdown', '.json', '.csv'])
const require = createRequire(import.meta.url)
const pdfjsRoot = dirname(require.resolve('pdfjs-dist/package.json'))
const standardFontDataUrl = `${join(pdfjsRoot, 'standard_fonts')}/`
const cMapUrl = `${join(pdfjsRoot, 'cmaps')}/`
const uploadRoot = join(process.cwd(), 'data', 'uploads')
const ocrTextThreshold = 20

function badRequest(message) {
  const error = new Error(message)
  error.status = 400
  return error
}

function getExtension(filename) {
  const match = filename.toLowerCase().match(/\.[^.]+$/)
  return match ? match[0] : ''
}

function getHeaderValue(headers, name) {
  return headers[name.toLowerCase()] || ''
}

function parseContentDisposition(value) {
  const parts = value.split(';').map(part => part.trim())
  const result = {}

  for (const part of parts) {
    const [key, rawValue] = part.split('=')
    if (!rawValue) continue
    result[key] = rawValue.replace(/^"|"$/g, '')
  }

  return result
}

function splitBuffer(buffer, delimiter) {
  const chunks = []
  let start = 0
  let index = buffer.indexOf(delimiter, start)

  while (index !== -1) {
    chunks.push(buffer.subarray(start, index))
    start = index + delimiter.length
    index = buffer.indexOf(delimiter, start)
  }

  chunks.push(buffer.subarray(start))
  return chunks
}

function trimPart(buffer) {
  let start = 0
  let end = buffer.length

  if (buffer.subarray(0, 2).toString() === '\r\n') start = 2
  if (buffer.subarray(start, start + 2).toString() === '--') return null
  if (buffer.subarray(end - 2).toString() === '\r\n') end -= 2

  return buffer.subarray(start, end)
}

function parseHeaders(buffer) {
  const marker = Buffer.from('\r\n\r\n')
  const headerEnd = buffer.indexOf(marker)
  if (headerEnd === -1) return null

  const headerText = buffer.subarray(0, headerEnd).toString('utf8')
  const headers = {}

  for (const line of headerText.split('\r\n')) {
    const separator = line.indexOf(':')
    if (separator === -1) continue
    headers[line.slice(0, separator).trim().toLowerCase()] = line.slice(separator + 1).trim()
  }

  return {
    headers,
    body: buffer.subarray(headerEnd + marker.length)
  }
}

export function parseMultipartBody(request) {
  const contentType = request.headers['content-type'] || ''
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/)
  const boundary = boundaryMatch?.[1] || boundaryMatch?.[2]

  if (!boundary) {
    throw badRequest('Missing multipart boundary')
  }

  const files = []
  const fields = {}
  const delimiter = Buffer.from(`--${boundary}`)

  for (const rawPart of splitBuffer(request.body, delimiter)) {
    const part = trimPart(rawPart)
    if (!part?.length) continue

    const parsed = parseHeaders(part)
    if (!parsed) continue

    const disposition = parseContentDisposition(getHeaderValue(parsed.headers, 'content-disposition'))
    if (!disposition.name) continue

    if (disposition.filename) {
      files.push({
        fieldName: disposition.name,
        originalName: disposition.filename,
        mimeType: getHeaderValue(parsed.headers, 'content-type') || 'application/octet-stream',
        buffer: parsed.body
      })
    } else {
      fields[disposition.name] = parsed.body.toString('utf8')
    }
  }

  return { fields, files }
}

async function ocrPdfPage(page, worker) {
  const viewport = page.getViewport({ scale: 2 })
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
  const context = canvas.getContext('2d')

  await page.render({
    canvasContext: context,
    viewport
  }).promise

  const image = await canvas.encode('png')
  const result = await worker.recognize(image)

  return result.data.text || ''
}

async function readPdf(buffer) {
  const pdf = await getDocument({
    data: new Uint8Array(buffer),
    cMapPacked: true,
    cMapUrl,
    disableFontFace: true,
    isEvalSupported: false,
    standardFontDataUrl
  }).promise
  const pages = []
  const pageRefs = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    pageRefs.push(page)
    const content = await page.getTextContent()
    const text = content.items
      .map(item => item.str)
      .filter(Boolean)
      .join(' ')

    pages.push(text)
  }

  const extractedText = pages.join('\n\n')
  if (extractedText.trim().length >= ocrTextThreshold) {
    return {
      text: extractedText,
      ocrUsed: false,
      pageCount: pdf.numPages
    }
  }

  const ocrPages = []
  const worker = await createWorker('eng')

  try {
    for (const page of pageRefs) {
      ocrPages.push(await ocrPdfPage(page, worker))
    }
  } finally {
    await worker.terminate()
  }

  return {
    text: ocrPages.join('\n\n'),
    ocrUsed: true,
    pageCount: pdf.numPages
  }
}

async function fileToDocument(file) {
  const extension = getExtension(file.originalName)
  const isPdf = file.mimeType === 'application/pdf' || extension === '.pdf'

  if (!isPdf && !textExtensions.has(extension)) {
    throw badRequest(`Unsupported file type: ${file.originalName}`)
  }

  const buffer = file.buffer || await readFile(file.path)
  const pdfResult = isPdf ? await readPdf(buffer) : null
  const text = isPdf ? pdfResult.text : buffer.toString('utf8')
  if (!text.trim()) {
    throw badRequest(`No text found in ${file.originalName}`)
  }

  return {
    title: file.originalName,
    sourceType: isPdf ? 'pdf' : 'file',
    text,
    metadata: {
      sourceFileName: file.originalName,
      mimeType: file.mimeType,
      byteSize: file.byteSize || buffer.length,
      ...(isPdf ? {
        pageCount: pdfResult.pageCount,
        ocrUsed: pdfResult.ocrUsed
      } : {})
    }
  }
}

function sanitizeFilename(filename) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export async function uploadedFilesToPayload({ request, uploadId, baseMetadata = {} }) {
  const { fields, files } = parseMultipartBody(request)
  let fieldMetadata = {}

  try {
    fieldMetadata = fields.metadata ? JSON.parse(fields.metadata) : {}
  } catch {
    throw badRequest('Invalid upload metadata')
  }

  if (files.length === 0) {
    throw badRequest('No files uploaded')
  }

  const uploadDir = join(uploadRoot, uploadId)
  await mkdir(uploadDir, { recursive: true })
  const uploads = []

  for (const [index, file] of files.entries()) {
    const filename = `${index}-${sanitizeFilename(file.originalName)}`
    const path = join(uploadDir, filename)
    await writeFile(path, file.buffer)
    uploads.push({
      path,
      originalName: file.originalName,
      mimeType: file.mimeType,
      byteSize: file.buffer.length
    })
  }

  return {
    uploads,
    metadata: {
      ...baseMetadata,
      ...fieldMetadata
    }
  }
}

export async function uploadedFilesPayloadToDocuments(payload) {
  if (!Array.isArray(payload.uploads)) return payload

  const documents = []

  for (const [index, upload] of payload.uploads.entries()) {
    try {
      const document = await fileToDocument(upload)
      documents.push({
        ...document,
        fileIndex: index,
        fileName: upload.originalName
      })
    } catch (error) {
      documents.push({
        title: upload.originalName,
        sourceType: 'file',
        text: '',
        fileIndex: index,
        fileName: upload.originalName,
        fileError: error.message,
        metadata: {
          sourceFileName: upload.originalName,
          mimeType: upload.mimeType,
          byteSize: upload.byteSize
        }
      })
    }
  }

  return {
    ...payload,
    uploads: undefined,
    documents
  }
}
