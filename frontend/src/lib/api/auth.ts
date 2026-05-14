import apiClient from "./client"

export interface LoginRequest {
  email: string
  password: string
  totp_code?: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
  password_change_required: boolean
}

export interface RegisterRequest {
  email: string
  password: string
  full_name?: string
}

export interface Setup2FARequest {
  email: string
  password: string
}

export interface Setup2FAResponse {
  otp_uri: string
  secret: string
}

export interface ChangePasswordRequest {
  email: string
  current_password: string
  new_password: string
  totp_code?: string
}

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<LoginResponse>("/auth/login", data, { withAuth: false }),

  register: (data: RegisterRequest) =>
    apiClient.post<{ status: string }>("/auth/register", data, { withAuth: false }),

  refresh: () =>
    apiClient.post<LoginResponse>("/auth/refresh", {}, { withAuth: false }),

  logout: () =>
    apiClient.post<{ status: string }>("/auth/logout", {}, { withAuth: false }),

  logoutAll: () =>
    apiClient.post<{ status: string }>("/auth/logout-all", {}, { withAuth: true }),

  setup2FA: (data: Setup2FARequest) =>
    apiClient.post<Setup2FAResponse>("/auth/setup-2fa", data, { withAuth: false }),

  changePassword: (data: ChangePasswordRequest) =>
    apiClient.post<{ status: string }>("/auth/change-password", data, { withAuth: false }),
}
