// Dev: talk to the local Express server on :4001.
// Prod (Vercel): same-origin serverless functions under /api.
const API_BASE = import.meta.env.DEV ? 'http://localhost:4001/api' : '/api'

const KEY_STORAGE = 'compass_key'
const SESSION_STORAGE = 'compass_usage_session'
export const getKey = () => localStorage.getItem(KEY_STORAGE) ?? ''
export const setKey = (k: string) => localStorage.setItem(KEY_STORAGE, k)
export const clearKey = () => localStorage.removeItem(KEY_STORAGE)

function usageSession() {
  let id = sessionStorage.getItem(SESSION_STORAGE)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(SESSION_STORAGE, id)
  }
  return id
}

export function trackUsage(event_name: string, feature: string, route = '', metadata: Record<string, unknown> = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const key = getKey()
  if (key) headers['x-compass-key'] = key
  void fetch(`${API_BASE}/usage/events`, {
    method: 'POST', headers,
    body: JSON.stringify({ session_id: usageSession(), event_name, feature, route, metadata }),
    keepalive: true,
  }).catch(() => undefined)
}

export class UnauthorizedError extends Error {
  constructor() { super('unauthorized') }
}

async function req<T>(path: string, method: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  if (body) headers['Content-Type'] = 'application/json'
  const key = getKey()
  if (key) headers['x-compass-key'] = key
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401) throw new UnauthorizedError()
  if (!res.ok) {
    let msg = `API error: ${res.status}`
    try { msg = (await res.json()).error ?? msg } catch { /* ignore */ }
    throw new Error(msg)
  }
  const data = await res.json()
  if (method !== 'GET' && !path.startsWith('/usage/')) {
    const feature = path.split('/').filter(Boolean)[0] ?? 'unknown'
    trackUsage('mutation_completed', feature, window.location.pathname, { method, resource: path.replace(/[0-9a-f-]{20,}/gi, ':id') })
  }
  return data
}

export const fetchApi = <T>(p: string) => req<T>(p, 'GET')
export const postApi = <T>(p: string, b: unknown) => req<T>(p, 'POST', b)
export const putApi = <T>(p: string, b: unknown) => req<T>(p, 'PUT', b)
export const patchApi = <T>(p: string, b: unknown) => req<T>(p, 'PATCH', b)
export const deleteApi = <T>(p: string) => req<T>(p, 'DELETE')

/** Verify a candidate key against the API; returns true if accepted. */
export async function verifyKey(candidate: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/domains`, { headers: { 'x-compass-key': candidate } })
  return res.ok
}

/** Whether the backend requires a password. */
export async function isGated(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`)
    const d = await res.json()
    return !!d.gated
  } catch { return false }
}
