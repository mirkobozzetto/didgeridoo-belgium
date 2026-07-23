import { API_BASE } from './pb'
import type { AdminSession } from './admin-session'
import type { EventRecord } from './admin-cards'

export async function fetchRecords<T>(
  session: AdminSession,
  collection: string,
  filter: string,
  sort: string,
  perPage = 200,
  expand = '',
): Promise<T[] | null> {
  const token = session.getToken()
  if (!token) return null
  const q = encodeURIComponent(filter)
  const expandParam = expand ? `&expand=${expand}` : ''
  const res = await fetch(
    `${API_BASE}/pb/api/collections/${collection}/records?perPage=${perPage}&filter=${q}&sort=${sort}${expandParam}`,
    { headers: { authorization: token } },
  )
  if (res.status === 401) {
    session.handleExpired()
    return null
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = (await res.json()) as { items: T[] }
  return json.items
}

export function fetchEvents(
  session: AdminSession,
  filter: string,
  sort: string,
  perPage = 200,
): Promise<EventRecord[] | null> {
  return fetchRecords<EventRecord>(
    session,
    'events',
    filter,
    sort,
    perPage,
    'organizer',
  )
}

export async function patchRecord(
  session: AdminSession,
  collection: string,
  id: string,
  body: Record<string, string>,
): Promise<string | null> {
  const token = session.getToken()
  if (!token) return 'Session expirée.'
  const res = await fetch(
    `${API_BASE}/pb/api/collections/${collection}/records/${id}`,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', authorization: token },
      body: JSON.stringify(body),
    },
  )
  if (res.status === 401) {
    session.handleExpired()
    return 'Session expirée.'
  }
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { message?: string }
    return json.message ?? `Erreur ${res.status}.`
  }
  return null
}

export function patchStatus(
  session: AdminSession,
  id: string,
  body: Record<string, string>,
): Promise<string | null> {
  return patchRecord(session, 'events', id, body)
}

export async function deleteRecord(
  session: AdminSession,
  collection: string,
  id: string,
): Promise<string | null> {
  const token = session.getToken()
  if (!token) return 'Session expirée.'
  const res = await fetch(
    `${API_BASE}/pb/api/collections/${collection}/records/${id}`,
    { method: 'DELETE', headers: { authorization: token } },
  )
  if (res.status === 401) {
    session.handleExpired()
    return 'Session expirée.'
  }
  if (!res.ok) return `Erreur ${res.status}.`
  return null
}
