import { randomUUID, createHash } from 'crypto'
import { withClient } from './pool.js'

/**
 * Finds a document by its content hash or body text.
 *
 * This function searches for documents belonging to a specific user,
 * matching either the content hash (SHA-256) or the exact body text.
 * Used to check if a document has already been ingested before creating it again.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.userId - The ID of the user who owns the document
 * @param {string} params.contentHash - SHA-256 hash of the document content
 * @param {string} params.body - The full text content of the document
 * @returns {Promise<Object|null>} A promise that resolves to the found document object or null if not found
 *
 * @property {string} return.id - The document ID
 * @property {string} return.userId - The user ID who owns the document
 * @property {string} return.title - The document title
 * @property {string} return.sourceType - The source type of the document (e.g., 'file', 'url')
 * @property {string} return.body - The full text content of the document
 * @property {Object} return.metadata - Additional metadata about the document
 * @property {Date} return.createdAt - The creation timestamp
 */
export async function findDocumentByContentHash({ userId, contentHash, body }) {
  const result = await withClient(client => client.query(
    `select id, user_id as "userId", title, source_type as "sourceType", body, metadata, created_at as "createdAt"
     from documents
     where user_id = $1 and (content_hash = $2 or body = $3)
     limit 1`,
    [userId, contentHash, body]
  ))

  return result.rows[0] || null
}

/**
 * Creates a new document in the database.
 *
 * Generates a unique ID and SHA-256 hash for the document content,
 * then inserts it into the documents table. Returns the created document.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.userId - The ID of the user who owns the document
 * @param {string} params.title - The title of the document
 * @param {string} params.sourceType - The source type of the document (e.g., 'file', 'url')
 * @param {string} params.text - The full text content of the document
 * @param {Object} [params.metadata] - Additional metadata about the document (optional)
 * @returns {Promise<Object>} A promise that resolves to the created document object
 *
 * @property {string} return.id - The generated document ID
 * @property {string} return.userId - The user ID who owns the document
 * @property {string} return.title - The document title
 * @property {string} return.sourceType - The source type of the document (e.g., 'file', 'url')
 * @property {string} return.body - The full text content of the document
 * @property {Object} return.metadata - Additional metadata about the document
 * @property {Date} return.createdAt - The creation timestamp
 */
export async function createDocument({ userId, title, sourceType, text, metadata }) {
  const id = randomUUID()
  const contentHash = createHash('sha256').update(text, 'utf8').digest('hex')

  const result = await withClient(client => client.query(
    `insert into documents (id, user_id, title, source_type, body, content_hash, metadata)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning id, user_id as "userId", title, source_type as "sourceType", body, metadata, created_at as "createdAt"`,
    [id, userId, title, sourceType, text, contentHash, metadata]
  ))

  return result.rows[0]
}

/**
 * Deletes a document and its associated chunks from the database.
 *
 * Removes the document with the specified ID if it belongs to the given user.
 * Uses CASCADE delete on document_chunks table to automatically remove related chunks.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.userId - The ID of the user who owns the document
 * @param {string} params.documentId - The ID of the document to delete
 * @returns {Promise<Object>} A promise that resolves to an object indicating success or failure
 *
 * @property {boolean} return.success - Whether the deletion was successful
 * @property {string} [return.message] - Error message if deletion failed
 */
export async function deleteDocument({ userId, documentId }) {
  try {
    const result = await withClient(client => client.query(
      `delete from documents
       where id = $1 and user_id = $2
       returning id`,
      [documentId, userId]
    ))

    if (result.rows.length === 0) {
      return { success: false, message: 'Document not found or does not belong to user' }
    }

    return { success: true }
  } catch (error) {
    return { success: false, message: error.message }
  }
}

/**
 * Creates multiple document chunks in the database.
 *
 * Takes an array of chunk objects and inserts them into the document_chunks table
 * in a single batch operation. Each chunk is associated with a specific document.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.userId - The ID of the user who owns the chunks
 * @param {string} params.documentId - The ID of the parent document
 * @param {Array<Object>} params.chunks - Array of chunk objects to create
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of created chunk objects
 *
 * @property {number} return.id - The generated chunk ID
 * @property {string} return.documentId - The parent document ID
 * @property {number} return.chunkIndex - The index of the chunk within the document
 * @property {string} return.vectorKey - The vector key/identifier for the chunk
 * @property {string} return.content - The text content of the chunk
 * @property {number} return.tokenCount - The number of tokens in the chunk
 * @property {Object} return.metadata - Additional metadata about the chunk
 */
export async function createChunks({ userId, documentId, chunks }) {
  if (chunks.length === 0) return []

  return withClient(async client => {
    const values = []
    const placeholders = chunks.map((chunk, index) => {
      const offset = index * 7
      values.push(
        userId,
        documentId,
        chunk.chunkIndex,
        chunk.vectorKey,
        chunk.content,
        chunk.tokenCount,
        chunk.metadata
      )
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`
    }).join(', ')

    const result = await client.query(
      `insert into document_chunks
        (user_id, document_id, chunk_index, vector_key, content, token_count, metadata)
       values ${placeholders}
       returning id, document_id as "documentId", chunk_index as "chunkIndex",
         vector_key as "vectorKey", content, token_count as "tokenCount", metadata`,
      values
    )

    return result.rows
  })
}

/**
 * Retrieves cluster statistics for a user.
 *
 * Returns aggregated statistics including:
 * - Number of documents
 * - Number of vector chunks
 * - Compression factor (fixed at 16)
 * - Average query latency from audit logs
 *
 * @param {Object} params - The parameters object
 * @param {string} params.userId - The ID of the user to get statistics for
 * @returns {Promise<Object>} A promise that resolves to an object containing cluster statistics
 *
 * @property {number} return.documents - Total number of documents
 * @property {number} return.vectors - Total number of vector chunks
 * @property {number} return.compression_factor - Fixed compression factor value (16)
 * @property {number} return.avg_latency_ms - Average query latency in milliseconds (0 if no data)
 */
export async function getClusterStats({ userId }) {
  const result = await withClient(client => client.query(
    `select
      (select count(*)::int from documents where user_id = $1) as documents,
      (select count(*)::int from document_chunks dc join documents d on d.id = dc.document_id where d.user_id = $1) as vectors,
      16 as compression_factor,
      coalesce((select round(avg(latency_ms))::int from query_audit_logs where user_id = $1), 0) as avg_latency_ms`,
    [userId]
  ))

  return result.rows[0]
}

/**
 * Lists document chunks for a user, ordered by creation date (newest first).
 *
 * Retrieves chunk information including the associated document title.
 * Useful for browsing or debugging chunk data.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.userId - The ID of the user who owns the chunks
 * @param {number} [params.limit=50] - Maximum number of chunks to return (default: 50)
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of chunk objects
 *
 * @property {number} return.id - The chunk ID
 * @property {string} return.documentId - The parent document ID
 * @property {string} return.title - The title of the parent document
 * @property {number} return.chunkIndex - The index of the chunk within the document
 * @property {string} return.vectorKey - The vector key/identifier for the chunk
 * @property {string} return.content - The text content of the chunk
 * @property {number} return.tokenCount - The number of tokens in the chunk
 * @property {Date} return.createdAt - The creation timestamp
 */
export async function listChunks({ userId, limit = 200 }) {
  const result = await withClient(client => client.query(
    `select dc.id, dc.document_id as "documentId", d.title, dc.chunk_index as "chunkIndex",
      dc.vector_key as "vectorKey", dc.content, dc.token_count as "tokenCount", dc.created_at as "createdAt"
     from document_chunks dc
     join documents d on d.id = dc.document_id
     where dc.user_id = $1
     order by dc.created_at desc
     limit $2`,
    [userId, limit]
  ))

  return result.rows
}

/**
 * Lists all documents for a user, ordered by creation date (newest first).
 *
 * Retrieves document information including title, source type, and metadata.
 * Useful for browsing ingested documents.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.userId - The ID of the user who owns the documents
 * @param {number} [params.limit=50] - Maximum number of documents to return (default: 50)
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of document objects
 *
 * @property {string} return.id - The document ID
 * @property {string} return.title - The document title
 * @property {string} return.sourceType - The source type of the document (e.g., 'file', 'url')
 * @property {Date} return.createdAt - The creation timestamp
 * @property {Object} return.metadata - Additional metadata about the document
 */
export async function listDocuments({ userId, limit = 50 }) {
  const result = await withClient(client => client.query(
    `select id, title, source_type as "sourceType", created_at as "createdAt", metadata
     from documents
     where user_id = $1
     order by created_at desc
     limit $2`,
    [userId, limit]
  ))

  return result.rows
}

/**
 * Finds document chunks by their vector keys.
 *
 * Retrieves chunk information for specific vector keys (used in vector search).
 * Returns the associated document title for context.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.userId - The ID of the user who owns the chunks
 * @param {Array<string>} params.vectorKeys - Array of vector key strings to find
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of chunk objects
 *
 * @property {number} return.id - The chunk ID
 * @property {string} return.vectorKey - The vector key/identifier for the chunk
 * @property {string} return.content - The text content of the chunk
 * @property {Object} return.metadata - Additional metadata about the chunk
 * @property {string} return.title - The title of the parent document
 */
export async function findChunksByVectorKeys({ userId, vectorKeys }) {
  if (vectorKeys.length === 0) return []

  const result = await withClient(client => client.query(
    `select dc.id, dc.vector_key as "vectorKey", dc.content, dc.metadata, d.title
     from document_chunks dc
     join documents d on d.id = dc.document_id
     where dc.user_id = $1 and dc.vector_key::text = any($2::text[])`,
    [userId, vectorKeys]
  ))

  return result.rows
}

/**
 * Finds document chunks containing specific text.
 *
 * Performs a case-insensitive ILIKE search on chunk content to find chunks
 * matching the query string. Useful for keyword-based searching.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.userId - The ID of the user who owns the chunks
 * @param {string} params.query - The text query to search for
 * @param {number} [params.limit=5] - Maximum number of chunks to return (default: 5)
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of chunk objects
 *
 * @property {number} return.id - The chunk ID
 * @property {string} return.vectorKey - The vector key/identifier for the chunk
 * @property {string} return.content - The text content of the chunk
 * @property {Object} return.metadata - Additional metadata about the chunk
 * @property {string} return.title - The title of the parent document
 */
export async function findChunksByText({ userId, query, limit = 5 }) {
  if (!query || !query.trim()) return []

  const result = await withClient(client => client.query(
    `select dc.id, dc.vector_key as "vectorKey", dc.content, dc.metadata, d.title
     from document_chunks dc
     join documents d on d.id = dc.document_id
     where dc.user_id = $1 and dc.content ilike $2
     order by dc.created_at desc
     limit $3`,
    [userId, `%${query}%`, limit]
  ))

  return result.rows
}

/**
 * Writes a query audit log entry.
 *
 * Records information about executed queries for analytics and performance monitoring.
 * Stores query text, filters applied, execution time, and result count.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.userId - The ID of the user who owns the document
 * @param {string} [params.query] - The search query text (optional)
 * @param {Object} [params.filter] - The filter criteria applied to the query (optional)
 * @param {number} params.latencyMs - Query execution time in milliseconds
 * @param {number} params.resultCount - Number of results returned by the query
 */
export async function writeQueryAudit({ userId, query, filter, latencyMs, resultCount }) {
  await withClient(client => client.query(
    `insert into query_audit_logs (user_id, query_text, filter, latency_ms, result_count)
     values ($1, $2, $3, $4, $5)`,
    [userId, query, filter, latencyMs, resultCount]
  ))
}
