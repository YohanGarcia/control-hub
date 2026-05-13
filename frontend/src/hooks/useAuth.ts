"use client"

import { useAuthStore } from "@/stores/authStore"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useCallback } from "react"

const PUBLIC_PATHS = ["/login", "/register"]

export function useAuth() {
  const { isAuthenticated, checkAuth, isLoading } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()

  const validateAuth = useCallback(() => {
    const valid = checkAuth()
    const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path))

    if (!valid && !isPublicPath) {
      router.push("/login")
      return false
    }

    if (valid && isPublicPath) {
      router.push("/")
      return false
    }

    return true
  }, [checkAuth, pathname, router])

  useEffect(() => {
    validateAuth()
  }, [validateAuth])

  return {
    isAuthenticated,
    isLoading,
    validateAuth,
  }
}