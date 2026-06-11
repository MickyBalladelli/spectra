import { updateIngestionJob } from '../db/ingestionJobs.js'
import { ingestDocument } from './ingestionService.js'
import { uploadedFilesPayloadToDocuments } from './uploadParser.js'

function getDocumentsCompleted(progress) {
  if (progress.documentIndex === undefined) {
    return progress.percent === 100 ? 1 : 0
  }

  return progress.documentIndex + (progress.documentPercent === 100 ? 1 : 0)
}

export async function runIngestionJob(job) {
  const userId = job.userId

  try {
    const payload = await uploadedFilesPayloadToDocuments(job.payload)
    const result = await ingestDocument({ ...payload, userId }, async progress => {
      await updateIngestionJob({
        jobId: job.id,
        userId,
        patch: {
          status: 'running',
          stage: progress.stage,
          percent: progress.percent,
          message: progress.message,
          documentsCompleted: getDocumentsCompleted(progress)
        }
      })
    })

    await updateIngestionJob({
      jobId: job.id,
      userId,
      patch: {
        status: 'completed',
        stage: 'completed',
        percent: 100,
        message: 'Ingestion complete',
        documentsCompleted: job.documentsTotal,
        result,
        completedAt: new Date(),
        lockedAt: null
      }
    })
  } catch (error) {
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
