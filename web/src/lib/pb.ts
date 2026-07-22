export const API_BASE = (import.meta.env.PUBLIC_API_BASE ?? '').replace(
  /\/$/,
  '',
)
const BASE = `${API_BASE}/pb`

export const AUTH_KEY = 'pb_auth'
export const ADMIN_AUTH_KEY = 'pb_admin_auth'

export interface PbAuth {
  token: string
  record: { id: string; email: string; name?: string }
}

function readAuth(key: string): PbAuth | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PbAuth
    return parsed?.token ? parsed : null
  } catch {
    return null
  }
}

export function getAuth(): PbAuth | null {
  return readAuth(AUTH_KEY)
}

export function setAuth(auth: PbAuth): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth))
}

export function clearAuth(): void {
  localStorage.removeItem(AUTH_KEY)
}

export function getAdminAuth(): PbAuth | null {
  return readAuth(ADMIN_AUTH_KEY)
}

export function setAdminAuth(auth: PbAuth): void {
  localStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify(auth))
}

export function isAdmin(): boolean {
  return getAdminAuth() != null
}

export function clearAllAuth(): void {
  localStorage.removeItem(AUTH_KEY)
  localStorage.removeItem(ADMIN_AUTH_KEY)
}

export interface LoginResult {
  organizer: boolean
  admin: boolean
}

// Une même identité peut être un compte organisateur (users) et/ou un superuser
// admin : on tente les deux endpoints, on stocke chaque token qui répond.
export async function loginBoth(
  identity: string,
  password: string,
): Promise<LoginResult> {
  const attempt = async (path: string): Promise<PbAuth | null> => {
    try {
      return await pb<PbAuth>(path, {
        method: 'POST',
        body: { identity, password },
      })
    } catch {
      return null
    }
  }

  const [organizerAuth, adminAuth] = await Promise.all([
    attempt('/api/collections/users/auth-with-password'),
    attempt('/api/collections/_superusers/auth-with-password'),
  ])

  if (organizerAuth) setAuth(organizerAuth)
  if (adminAuth) setAdminAuth(adminAuth)

  return { organizer: organizerAuth != null, admin: adminAuth != null }
}

export class PbError extends Error {
  data: unknown
  status: number
  constructor(message: string, status: number, data: unknown) {
    super(message)
    this.status = status
    this.data = data
  }
}

interface PbRequest {
  method?: string
  body?: unknown
  auth?: boolean
}

export async function pb<T = unknown>(
  path: string,
  opts: PbRequest = {},
): Promise<T> {
  const { method = 'GET', body, auth = false } = opts
  const headers: Record<string, string> = {}
  const isForm = body instanceof FormData

  if (body != null && !isForm) headers['content-type'] = 'application/json'
  if (auth) {
    const current = getAuth()
    if (current) headers['authorization'] = current.token
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isForm ? body : body != null ? JSON.stringify(body) : undefined,
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new PbError(
      (json as { message?: string })?.message ?? 'Erreur',
      res.status,
      json,
    )
  }
  return json as T
}

const ACCENTS = /[̀-ͯ]/g

export function slugify(title: string): string {
  const base = title
    .normalize('NFD')
    .replace(ACCENTS, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${base || 'event'}-${suffix}`
}

export function toPbDate(local: string): string {
  if (!local) return ''
  const d = new Date(local)
  const p = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ` +
    `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`
  )
}

export function fromPbDate(value: string): string {
  if (!value) return ''
  const iso = value.replace(' ', 'T') + (value.includes('Z') ? '' : 'Z')
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat('fr-BE', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Brussels',
  }).format(d)
}
