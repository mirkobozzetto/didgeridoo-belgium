import { API_BASE } from './pb'
import type { AdminSession } from './admin-session'
import type { EventRecord } from './admin-cards'

export async function fetchEvents(
  session: AdminSession,
  filter: string,
  sort: string,
  perPage = 200,
): Promise<EventRecord[] | null> {
  const token = session.getToken()
  if (!token) return null
  const q = encodeURIComponent(filter)
  const res = await fetch(
    `${API_BASE}/pb/api/collections/events/records?perPage=${perPage}&filter=${q}&sort=${sort}&expand=organizer`,
    { headers: { authorization: token } },
  )
  if (res.status === 401) {
    session.handleExpired()
    return null
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = (await res.json()) as { items: EventRecord[] }
  return json.items
}

export async function patchStatus(
  session: AdminSession,
  id: string,
  body: Record<string, string>,
): Promise<string | null> {
  const token = session.getToken()
  if (!token) return 'Session expirée.'
  const res = await fetch(
    `${API_BASE}/pb/api/collections/events/records/${id}`,
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
