import type { Context, Next } from 'hono'

// Limiteur en mémoire : un seul conteneur en prod, pas besoin de Redis.
// Fenêtre fixe par IP ; purge paresseuse pour borner la mémoire.
const PURGE_THRESHOLD = 10_000

type Window = { count: number; resetAt: number }

function clientIp(c: Context): string {
  // Derrière Traefik : premier hop de x-forwarded-for = IP réelle du client.
  const fwd = c.req.header('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return c.req.header('x-real-ip') ?? 'unknown'
}

export function rateLimit(opts: {
  limit: number
  windowMs: number
  skip?: (c: Context) => boolean
}) {
  const store = new Map<string, Window>()

  return async (c: Context, next: Next) => {
    if (opts.skip?.(c)) return next()

    const now = Date.now()
    if (store.size > PURGE_THRESHOLD) {
      for (const [key, win] of store) {
        if (win.resetAt <= now) store.delete(key)
      }
    }

    const ip = clientIp(c)
    const win = store.get(ip)
    if (!win || win.resetAt <= now) {
      store.set(ip, { count: 1, resetAt: now + opts.windowMs })
      return next()
    }

    win.count++
    if (win.count > opts.limit) {
      c.header('retry-after', String(Math.ceil((win.resetAt - now) / 1000)))
      return c.json({ ok: false, error: 'rate_limited' }, 429)
    }
    return next()
  }
}
