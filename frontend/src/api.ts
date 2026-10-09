export type User = { id: number; email: string }
export type Session = { user: User; csrf_token: string }
export type Portfolio = { id: number; name: string; base_currency: string }
export type RawRow = {
  symbol: string; exchange: string; quantity: string; unit_price: string;
  market_value: string; currency: string; snapshot_date: string
}
export type PreviewRow = RawRow & { row: number; errors: string[]; status: 'valid' | 'invalid' }
export type Preview = { rows: PreviewRow[]; valid: boolean }
export type Position = Omit<RawRow, 'snapshot_date' | 'unit_price'> & { unit_price: string | null; weight_pct: string }
export type Dashboard = {
  portfolio: Portfolio;
  snapshot: { id: number; as_of: string } | null;
  total_value: string | null;
  positions: Position[];
  metrics_unavailable: string[];
}

let csrf = ''
export function setCsrf(next: string) { csrf = next }

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = init.method?.toUpperCase() || 'GET'
  const mutation = method !== 'GET' && method !== 'HEAD'
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (mutation && csrf) headers.set('X-CSRF-Token', csrf)
  const res = await fetch(`/api${path}`, { credentials: 'same-origin', ...init, headers })
  const json: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const result = json as { detail?: string | { message?: string } } | null
    const msg = typeof result?.detail === 'string' ? result.detail : (result?.detail && typeof result.detail === 'object' ? result.detail.message : undefined)
    throw new Error(msg || `Request failed (${res.status})`)
  }
  return json as T
}

export async function refreshSession(): Promise<Session | null> {
  try {
    const value = await api<Session>('/auth/me')
    setCsrf(value.csrf_token)
    return value
  } catch {
    setCsrf('')
    return null
  }
}

export function emptyRow(date: string): RawRow {
  return { symbol: '', exchange: 'NASDAQ', quantity: '', unit_price: '', market_value: '', currency: 'USD', snapshot_date: date }
}
