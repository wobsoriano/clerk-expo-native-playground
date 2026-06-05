import { useSyncExternalStore } from 'react'

export type LogEntry = { id: number; t: number; msg: string }

let entries: LogEntry[] = []
let listeners = new Set<() => void>()
let counter = 0
const startedAt = Date.now()

/**
 * Append a timestamped line to the shared on-screen test log.
 * `t` is milliseconds since the app store was first loaded, so you can
 * eyeball how long a sign-out / refresh actually takes.
 */
export function logEvent(msg: string): void {
  const t = Date.now() - startedAt
  // Mirror to the Metro/Xcode/logcat console so events are visible even when a
  // full-screen native view is covering the on-screen log.
  console.log(`[testlog] t=${(t / 1000).toFixed(2)}s ${msg}`)
  entries = [{ id: counter++, t, msg }, ...entries].slice(0, 150)
  listeners.forEach(l => l())
}

export function clearLog(): void {
  entries = []
  listeners.forEach(l => l())
}

function subscribe(l: () => void): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

function getSnapshot(): LogEntry[] {
  return entries
}

export function useEventLog(): LogEntry[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
