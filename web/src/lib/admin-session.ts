import {
  API_BASE,
  getAdminAuth,
  setAdminAuth,
  clearAllAuth,
  type PbAuth,
} from './pb'

export interface AdminSession {
  getToken(): string | null
  handleExpired(): void
}

// Contrat DOM : le form AdminLoginForm (#login, #identity, #password,
// #login-error) et un panneau de contenu à révéler une fois connecté.
export function initAdminSession(opts: {
  panel: HTMLElement
  onAuth: () => void
}): AdminSession {
  const loginForm = document.getElementById('login') as HTMLFormElement
  const loginError = document.getElementById(
    'login-error',
  ) as HTMLParagraphElement

  function show(authenticated: boolean) {
    loginForm.hidden = authenticated
    opts.panel.hidden = !authenticated
  }

  function getToken(): string | null {
    return getAdminAuth()?.token ?? null
  }

  function handleExpired() {
    clearAllAuth()
    show(false)
    loginError.hidden = false
    loginError.textContent = 'Session expirée, reconnecte-toi.'
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    loginError.hidden = true
    const identity = (
      document.getElementById('identity') as HTMLInputElement
    ).value.trim()
    const password = (document.getElementById('password') as HTMLInputElement)
      .value
    try {
      const res = await fetch(
        `${API_BASE}/pb/api/collections/_superusers/auth-with-password`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ identity, password }),
        },
      )
      const json = (await res.json()) as PbAuth & { message?: string }
      if (!res.ok || !json.token) {
        loginError.hidden = false
        loginError.textContent = json.message ?? 'Identifiants invalides.'
        return
      }
      setAdminAuth(json)
      show(true)
      opts.onAuth()
    } catch {
      loginError.hidden = false
      loginError.textContent = 'Connexion impossible. Réessaie.'
    }
  })

  if (getToken()) {
    show(true)
    // microtask : laisse l'appelant finir de se câbler (la session est
    // encore en cours de construction quand ce init s'exécute)
    queueMicrotask(opts.onAuth)
  } else {
    show(false)
  }

  return { getToken, handleExpired }
}
