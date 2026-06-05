const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export async function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem('token')

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })

  if (!res.ok) {
    let message = 'Request failed'
    try {
      const data = await res.json()
      message = data.error || message
    } catch {
      message = await res.text().catch(() => message)
    }
    throw new Error(message)
  }

  return res.json()
}