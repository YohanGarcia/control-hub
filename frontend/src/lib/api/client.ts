function resolveApiBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_API_URL
  if (!raw || raw.includes("<") || raw.includes(">")) {
    return "http://localhost:8000/api/v1"
  }
  return raw
}

const API_BASE_URL = resolveApiBaseUrl()

interface ApiClientOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  headers?: Record<string, string>
  withAuth?: boolean
}

class ApiClient {
  private baseUrl: string
  private accessToken: string | null = null
  private refreshPromise: Promise<boolean> | null = null

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  setTokens(accessToken: string | null) {
    this.accessToken = accessToken
  }

  clearTokens() {
    this.accessToken = null
  }

  getAccessToken(): string | null {
    return this.accessToken
  }

  private async request<T>(path: string, options: ApiClientOptions = {}): Promise<T> {
    const { method = "GET", body, headers = {}, withAuth = true } = options

    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    }

    if (withAuth && this.accessToken) {
      requestHeaders["Authorization"] = `Bearer ${this.accessToken}`
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    })

    if (response.status === 401 && withAuth) {
      const refreshed = await this.tryRefreshToken()
      if (refreshed) {
        requestHeaders["Authorization"] = `Bearer ${this.accessToken}`
        const retryResponse = await fetch(`${this.baseUrl}${path}`, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
          credentials: "include",
        })
        if (!retryResponse.ok) {
          throw new ApiError(retryResponse.status, await retryResponse.json())
        }
        return retryResponse.json()
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(response.status, errorData)
    }

    if (response.status === 204) {
      return {} as T
    }

    return response.json()
  }

  private async tryRefreshToken(): Promise<boolean> {
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    this.refreshPromise = this.refreshWithCookie()
    try {
      return await this.refreshPromise
    } finally {
      this.refreshPromise = null
    }
  }

  private async refreshWithCookie(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        this.accessToken = data.access_token
        return true
      }
    } catch {
      return false
    }
    this.clearTokens()
    if (typeof window !== "undefined") {
      window.location.href = "/login"
    }
    return false
  }

  async get<T>(path: string, options: { withAuth?: boolean; headers?: Record<string, string> } = {}): Promise<T> {
    return this.request<T>(path, { method: "GET", ...options })
  }

  async post<T>(path: string, body: unknown, options: { withAuth?: boolean; headers?: Record<string, string> } = {}): Promise<T> {
    return this.request<T>(path, { method: "POST", body, ...options })
  }

  async put<T>(path: string, body: unknown, options: { withAuth?: boolean; headers?: Record<string, string> } = {}): Promise<T> {
    return this.request<T>(path, { method: "PUT", body, ...options })
  }

  async patch<T>(path: string, body: unknown, options: { withAuth?: boolean; headers?: Record<string, string> } = {}): Promise<T> {
    return this.request<T>(path, { method: "PATCH", body, ...options })
  }

  async delete<T>(path: string, options: { withAuth?: boolean; headers?: Record<string, string> } = {}): Promise<T> {
    return this.request<T>(path, { method: "DELETE", ...options })
  }

  getWsUrl(): string {
    try {
      const parsed = new URL(this.baseUrl)
      parsed.protocol = parsed.protocol === "https:" ? "wss:" : "ws:"
      return parsed.toString().replace(/\/$/, "")
    } catch {
      return "ws://localhost:8000/api/v1"
    }
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: Record<string, unknown>
  ) {
    super(body.detail as string || `HTTP ${status}`)
    this.name = "ApiError"
  }
}

export const apiClient = new ApiClient()
export default apiClient
