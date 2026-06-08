import { spawn } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { env } from '../config/env.js'

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')

export function runVectorWorker(payload) {
  return new Promise((resolve, reject) => {
    const worker = spawn('python3', [env.vectorWorkerPath], {
      cwd: backendRoot,
      stdio: ['pipe', 'pipe', 'pipe']
    })

    const timeoutMs = 120000
    let timedOut = false
    const timeout = setTimeout(() => {
      timedOut = true
      worker.kill('SIGTERM')

      setTimeout(() => {
        if (!worker.killed) {
          worker.kill('SIGKILL')
        }
      }, 5000)

      reject(new Error(`Vector worker timed out after ${timeoutMs / 1000}s`))
    }, timeoutMs)

    let stdout = ''
    let stderr = ''

    worker.stdout.on('data', data => {
      stdout += data.toString()
    })

    worker.stderr.on('data', data => {
      stderr += data.toString()
      console.error('[vector worker stderr]', data.toString())
    })

    worker.on('error', reject)

    worker.on('close', code => {
      clearTimeout(timeout)
      if (timedOut) return
      if (code !== 0) {
        reject(new Error(stderr || `Vector worker exited with code ${code}`))
        return
      }

      try {
        resolve(JSON.parse(stdout))
      } catch (error) {
        reject(new Error(`Bad vector worker response: ${error.message}`))
      }
    })

    worker.stdin.write(JSON.stringify(payload))
    worker.stdin.end()
  })
}
