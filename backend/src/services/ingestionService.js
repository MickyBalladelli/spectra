import { createChunks, createDocument, findDocumentByContentHash } from '../db/documents.js'
import { chunkText } from '../vector/chunker.js'
import { embedText } from '../vector/embedding.js'
import { runVectorWorker } from '../vector/workerBridge.js'
import { createHash } from 'crypto'

/**
 * Processes a single document through the ingestion pipeline
 * @param {Object} payload - Document data and configuration
 * @param {string} payload.userId - ID of the user who owns this document
 * @param {string} payload.title - Title of the document
 * @param {string} [payload.sourceType='raw'] - Type of source material
 * @param {string} payload.text - Text content to be ingested
 * @param {Object} [payload.metadata={}] - Additional metadata for the document
 * @param {Function} [emitProgress=() => {}] - Callback for progress reporting
 * @returns {Promise<Object>} Result containing document, chunks, and vector keys
 */
async function ingestSingleDocument({ userId, title, sourceType = 'raw', text, metadata = {} }, emitProgress = () => {}) {
  const documentMetadata = {
    ...metadata,
    userId,
    title,
    sourceType
  }

  // Create SHA-256 hash of document content for deduplication
  const contentHash = createHash('sha256').update(text, 'utf8').digest('hex')
  // Check if identical document already exists in database
  const existingDocument = await findDocumentByContentHash({ userId, contentHash, body: text })

  // Skip processing if duplicate found
  if (existingDocument) {
    await emitProgress({ stage: 'duplicate', percent: 100, message: 'Document already indexed' })

    return {
      duplicate: true,
      document: existingDocument,
      chunks: [],
      vectorKeys: []
    }
  }

  await emitProgress({ stage: 'metadata', percent: 10, message: 'Saving document' })
  const document = await createDocument({ userId, title, sourceType, text, metadata: documentMetadata })

  await emitProgress({ stage: 'chunking', percent: 25, message: 'Chunking text' })
  const chunks = chunkText(text)

  await emitProgress({ stage: 'embedding', percent: 55, message: 'Embedding chunks' })
  const embeddedChunks = chunks.map(chunk => ({
    ...chunk,
    vectorKey: createHash('sha256').update(`${document.id}:${chunk.chunkIndex}:${chunk.content}`, 'utf8').digest('hex').slice(0, 15),
    vector: embedText(chunk.content),
    metadata: {
      ...documentMetadata,
      documentId: document.id,
      chunkIndex: chunk.chunkIndex
    }
  }))

  await emitProgress({ stage: 'indexing', percent: 75, message: 'Writing turbovec index' })
  const workerResult = await runVectorWorker({
    operation: 'upsert',
    documentId: document.id,
    chunks: embeddedChunks.map(chunk => ({
      chunkIndex: chunk.chunkIndex,
      vectorKey: chunk.vectorKey,
      vector: chunk.vector,
      metadata: chunk.metadata
    }))
  })

  await emitProgress({ stage: 'persisting', percent: 90, message: 'Saving indexed chunks' })
  const persistedChunks = await createChunks({
    userId,
    documentId: document.id,
    chunks: embeddedChunks
  })

  await emitProgress({ stage: 'completed', percent: 100, message: 'Document indexed' })

  return {
    document,
    chunks: persistedChunks,
    vectorKeys: workerResult.vectorKeys
  }
}

/**
 * Main entry point for document ingestion
 * Handles both single documents and batches of documents
 * @param {Object|Array} payload - Document data or batch configuration
 * @param {Function} [emitProgress=() => {}] - Callback for progress reporting
 * @returns {Promise<Object>} Result containing processed documents, chunks, and vector keys
 */
export async function ingestDocument(payload, emitProgress = () => {}) {
  // Handle batch ingestion if documents array is provided
  if (Array.isArray(payload.documents) && payload.documents.length > 0) {
    const documentResults = []
    let allChunks = []
    let allVectorKeys = []

    for (const [index, pendingDocument] of payload.documents.entries()) {
      // Merge batch-level and document-level metadata
      const documentPayload = {
        ...pendingDocument,
        userId: payload.userId,
        metadata: {
          ...payload.metadata,
          ...pendingDocument.metadata
        }
      }

      // Process each document with progress tracking
      const result = await ingestSingleDocument(documentPayload, async progress => {
        const documentPercent = progress.percent || 0
        const percent = Math.round(((index + (documentPercent / 100)) / payload.documents.length) * 100)

        await emitProgress({
          documentIndex: index,
          documentsTotal: payload.documents.length,
          ...progress,
          documentPercent,
          percent
        })
      })

      documentResults.push(result)
      allChunks = allChunks.concat(result.chunks || [])
      allVectorKeys = allVectorKeys.concat(result.vectorKeys || [])
    }

    // Return aggregated results for batch processing
    return {
      documents: documentResults,
      chunks: allChunks,
      vectorKeys: allVectorKeys
    }
  }

  // Single document ingestion - ensure userId is passed correctly
  const singleDocPayload = {
    ...payload,
    userId: payload.userId
  }
  return ingestSingleDocument(singleDocPayload, emitProgress)
}
