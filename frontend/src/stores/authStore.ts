import { create } from "zustand"
import { persist } from "zustand/middleware"
import apiClient from "@/lib/api/client"
import { authApi, type LoginResponse } from "@/lib/api/auth"

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  hydrated: boolean
  isLoading: boolean
  error: string | null
  passwordChangeRequired: boolean

  login: (email: string, password: string, totpCode?: string) => Promise<void>
  register: (email: string, password: string, fullName?: string) => Promise<void>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
  clearError: () => void
  checkAuth: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      hydrated: false,
      isLoading: false,
      error: null,
      passwordChangeRequired: false,

      login: async (email: string, password: string, totpCode?: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authApi.login({ email, password, totp_code: totpCode })
          setTokens(set, response)
          set({ isLoading: false, isAuthenticated: true })
        } catch (error) {
          set({ isLoading: false, error: (error as Error).message })
          throw error
        }
      },

      register: async (email: string, password: string, fullName?: string) => {
        set({ isLoading: true, error: null })
        try {
          await authApi.register({ email, password, full_name: fullName })
          set({ isLoading: false })
        } catch (error) {
          set({ isLoading: false, error: (error as Error).message })
          throw error
        }
      },

      logout: async () => {
        const { refreshToken } = get()
        try {
          if (refreshToken) {
            await authApi.logout(refreshToken)
          }
        } catch {
        } finally {
          apiClient.clearTokens()
          set({
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            error: null,
          })
        }
      },

      refreshSession: async () => {
        const { refreshToken } = get()
        if (!refreshToken) {
          set({ isAuthenticated: false })
          return
        }
        try {
          const response = await authApi.refresh({ refresh_token: refreshToken })
          setTokens(set, response)
          set({ isAuthenticated: true })
        } catch {
          apiClient.clearTokens()
          set({
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          })
        }
      },

      clearError: () => set({ error: null }),

      checkAuth: () => {
        const { accessToken, refreshToken } = get()
        if (!accessToken || !refreshToken) return false
        apiClient.setTokens(accessToken, refreshToken)
        return true
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        passwordChangeRequired: state.passwordChangeRequired,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken && state?.refreshToken) {
          apiClient.setTokens(state.accessToken, state.refreshToken)
        }
        if (state) {
          state.hydrated = true
        }
      },
    }
  )
)

function setTokens(set: (state: Partial<AuthState>) => void, response: LoginResponse) {
  apiClient.setTokens(response.access_token, response.refresh_token)
  set({
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    passwordChangeRequired: response.password_change_required,
    isAuthenticated: true,
  })
}
