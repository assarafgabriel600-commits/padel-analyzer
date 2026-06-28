const BASE_URL = import.meta.env.VITE_API_URL || '/api'

function getToken() {
  return localStorage.getItem('brev_token')
}

function authHeaders(extra = {}) {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(BASE_URL + path, {
    method,
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    localStorage.removeItem('brev_token')
    localStorage.removeItem('brev_user')
    window.location.href = '/auth'
    throw new Error('Session expirée.')
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || `Erreur ${res.status}`)
  }

  if (res.status === 204 || res.headers.get('content-length') === '0') return null
  return res.json()
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (body) => request('/auth/register', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
}

// ── Subjects ──────────────────────────────────────────────────────────────────

export const subjectsApi = {
  list: () => request('/subjects'),
  get: (id) => request(`/subjects/${id}`),
  delete: (id) => request(`/subjects/${id}`, { method: 'DELETE' }),
}

// ── Chat SSE streaming ────────────────────────────────────────────────────────

export async function* streamChat(messages, sessionId) {
  const token = getToken()
  const res = await fetch(BASE_URL + '/chat/message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ messages, session_id: sessionId }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || `Erreur ${res.status}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''

    for (const block of parts) {
      const lines = block.split('\n')
      let eventName = ''
      let eventData = ''
      for (const line of lines) {
        if (line.startsWith('event: ')) eventName = line.slice(7).trim()
        else if (line.startsWith('data: ')) eventData = line.slice(6).trim()
      }
      if (eventName && eventData) {
        try {
          yield { event: eventName, data: JSON.parse(eventData) }
        } catch {
          // malformed JSON — skip
        }
      }
    }
  }
}
