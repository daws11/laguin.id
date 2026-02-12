const TOKEN_KEY = 'admin_token'

export function tokenStorage() {
  return {
    get: () => window.localStorage.getItem(TOKEN_KEY),
    set: (t: string) => window.localStorage.setItem(TOKEN_KEY, t),
    clear: () => window.localStorage.removeItem(TOKEN_KEY),
  }
}

