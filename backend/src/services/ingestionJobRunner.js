import { ingestionJobCancelRequested, updateIngestionJob } from '../db/ingestionJobs.js'
import { ingestDocument } from './ingestionService.js'
import { uploadedFilesPayloadToDocuments } from './uploadParser.js'

class IngestionCanceledError extends Error {
  constructor() {
    super('Ingestion canceled')
    this.name = 'IngestionCanceledError'
  }
}

function getDocumentsCompleted(progress) {
  if (progress.documentIndex === undefined) {
    return progress.percent === 100 ? 1 : 0
  }

  return progress.documentIndex + (progress.documentPercent === 100 ? 1 : 0)
}

export async function runIngestionJob(job) {
  const userId = job.userId

  try {
    async function stopIfCanceled() {
      if (await ingestionJobCancelRequested({ userId, jobId: job.id })) {
        throw new IngestionCanceledError()
      }
    }

    await stopIfCanceled()
    const payload = await uploadedFilesPayloadToDocuments(job.payload)
    const fileStatuses = Array.isArray(payload.documents)
      ? payload.documents.map((document, index) => ({
        index,
        fileName: document.fileName || document.title || `Document ${index + 1}`,
        status: 'queued',
        percent: 0,
        message: 'Queued',
        error: null
      }))
      : [{
        index: 0,
        fileName: payload.title || 'Document',
        status: 'queued',
        percent: 0,
        message: 'Queued',
        error: null
      }]

    const result = await ingestDocument({ ...payload, userId }, async progress => {
      await stopIfCanceled()
      const fileIndex = progress.documentIndex ?? 0
      const currentFile = fileStatuses[fileIndex]

      if (currentFile) {
        currentFile.status = progress.fileStatus || (progress.stage === 'failed' ? 'failed' : 'running')
        currentFile.percent = progress.documentPercent ?? progress.percent ?? currentFile.percent
        currentFile.message = progress.message || currentFile.message
        currentFile.error = progress.error || null
      }

      await updateIngestionJob({
        jobId: job.id,
        userId,
        patch: {
          status: 'running',
          stage: progress.stage,
          percent: progress.percent,
          message: progress.message,
          documentsCompleted: getDocumentsCompleted(progress),
          result: {
            files: fileStatuses
          }
        }
      })
    })
    await stopIfCanceled()
    const finalFiles = Array.isArray(result.documents)
      ? result.documents.map((document, index) => ({
        index,
        fileName: document.fileName || document.document?.title || fileStatuses[index]?.fileName || `Document ${index + 1}`,
        status: document.failed ? 'failed' : document.duplicate ? 'duplicate' : 'completed',
        percent: 100,
        message: document.failed
          ? document.error
          : document.duplicate
            ? 'Skipped duplicate'
            : 'Indexed',
        error: document.error || null,
        documentId: document.document?.id || null,
        chunkCount: Array.isArray(document.chunks) ? document.chunks.length : 0,
        vectorCount: Array.isArray(document.vectorKeys) ? document.vectorKeys.length : 0
      }))
      : [{
        index: 0,
        fileName: result.fileName || result.document?.title || payload.title || 'Document',
        status: result.duplicate ? 'duplicate' : 'completed',
        percent: 100,
        message: result.duplicate ? 'Skipped duplicate' : 'Indexed',
        error: null,
        documentId: result.document?.id || null,
        chunkCount: Array.isArray(result.chunks) ? result.chunks.length : 0,
        vectorCount: Array.isArray(result.vectorKeys) ? result.vectorKeys.length : 0
      }]
    const hasFailure = finalFiles.some(file => file.status === 'failed')
    const allFailed = finalFiles.length > 0 && finalFiles.every(file => file.status === 'failed')

    await updateIngestionJob({
      jobId: job.id,
      userId,
      patch: {
        status: allFailed ? 'failed' : 'completed',
        stage: hasFailure ? 'completed_with_errors' : 'completed',
        percent: 100,
        message: hasFailure ? 'Ingestion finished with file errors' : 'Ingestion complete',
        error: allFailed ? 'All files failed' : null,
        documentsCompleted: finalFiles.filter(file => file.status !== 'failed').length,
        result: {
          ...result,
          files: finalFiles
        },
        completedAt: new Date(),
        lockedAt: null
      }
    })
  } catch (error) {
    if (error.name === 'IngestionCanceledError') {
      await updateIngestionJob({
        jobId: job.id,
        userId,
        patch: {
          status: 'canceled',
          stage: 'canceled',
          message: 'Ingestion canceled',
          completedAt: new Date(),
          lockedAt: null
        }
      })
      return
    }

    await updateIngestionJob({
      jobId: job.id,
      userId,
      patch: {
        status: 'failed',
        stage: 'failed',
        percent: 0,
        message: 'Ingestion failed',
        error: error.message,
        completedAt: new Date(),
        lockedAt: null
      }
    })
  }
}
