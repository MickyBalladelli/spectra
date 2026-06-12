import { readdir, rm, stat } from 'fs/promises'
import { env } from '../config/env.js'
import { uploadRoot } from './uploadParser.js'
import { recordWorkerLog, recordErrorLog } from './observabilityService.js'

async function cleanupUploadsOnce() {
  const cutoff = Date.now() - (env.uploadCleanupMaxAgeHours * 60 * 60 * 1000)
  let removed = 0

  try {
    const entries = await readdir(uploadRoot, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const path = `${uploadRoot}/${entry.name}`
      const info = await stat(path)
      if (info.mtimeMs > cutoff) continue

      await rm(path, { recursive: true, force: true })
      removed += 1
    }

    if (removed > 0) {
      recordWorkerLog({
        workerId: 'upload-cleanup',
        message: `Removed ${removed} old upload folders`
      })
    }
  } catch (error) {
    if (error.code === 'ENOENT') return

    recordErrorLog({
      source: 'upload-cleanup',
      message: error.message,
      detail: error.stack
    })
  }
}

export function startUploadCleanupLoop() {
  let stopped = false
  let timer = null

  async function run() {
    if (stopped) return
    await cleanupUploadsOnce()
    if (!stopped) {
      timer = setTimeout(run, env.uploadCleanupIntervalMs)
    }
  }

  run().catch(error => {
    recordErrorLog({
      source: 'upload-cleanup',
      message: error.message,
      detail: error.stack
    })
  })

  return function stopUploadCleanupLoop() {
    stopped = true
    if (timer) clearTimeout(timer)
  }
}
