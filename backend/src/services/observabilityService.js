const maxEntries = 200
const stores = {
  requests: [],
  jobs: [],
  workers: [],
  errors: []
}

function pushLog(type, entry) {
  const log = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    at: new Date().toISOString(),
    ...entry
  }

  stores[type].unshift(log)
  stores[type] = stores[type].slice(0, maxEntries)
  return log
}

export function recordRequestLog(entry) {
  return pushLog('requests', entry)
}

export function recordJobLog(entry) {
  return pushLog('jobs', entry)
}

export function recordWorkerLog(entry) {
  return pushLog('workers', entry)
}

export function recordErrorLog(entry) {
  return pushLog('errors', entry)
}

function filterByUser(entries, userId) {
  return entries.filter(entry => !entry.userId || entry.userId === userId)
}

export function getObservabilityLogs({ userId }) {
  return {
    requests: filterByUser(stores.requests, userId),
    jobs: filterByUser(stores.jobs, userId),
    workers: stores.workers,
    errors: filterByUser(stores.errors, userId)
  }
}
