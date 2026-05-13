"use client"

import { useEffect, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"
import { useUIStore } from "@/stores/uiStore"
import { useAuthStore } from "@/stores/authStore"
import { Sidebar, MobileMenuButton } from "./sidebar"
import { Header } from "./header"
import { NotificationsPanel } from "./notifications-panel"
import { OnboardingWizard } from "@/components/shared/onboarding-wizard"
import { cn } from "@/lib/utils"

interface DashboardShellProps {
  children: React.ReactNode
}

function getOnboardingCompleted() {
  return localStorage.getItem("onboarding_completed")
}

function subscribeToOnboarding(callback: () => void) {
  window.addEventListener("storage", callback)
  return () => window.removeEventListener("storage", callback)
}

export function DashboardShell({ children }: DashboardShellProps) {
  const router = useRouter()
  const { sidebarCollapsed, mobileMenuOpen } = useUIStore()
  const { refreshSession, hydrated: authHydrated } = useAuthStore()

  const onboardingCompleted = useSyncExternalStore(
    subscribeToOnboarding,
    getOnboardingCompleted,
    () => null
  )

  useEffect(() => {
    if (!authHydrated) return
    refreshSession().then(() => {
      const { isAuthenticated: auth } = useAuthStore.getState()
      if (!auth) {
        router.push("/login")
      }
    })
  }, [authHydrated, router, refreshSession])

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#050816]">
      <Sidebar />
      <div
        className={cn(
          "transition-all duration-300",
          sidebarCollapsed ? "ml-[72px]" : "ml-[260px]",
          mobileMenuOpen && "md:ml-[260px]"
        )}
      >
        <Header />
        <main className="p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
      <NotificationsPanel />
      <MobileMenuButton />
      {onboardingCompleted !== "true" && (
        <OnboardingWizard />
      )}
    </div>
  )
}
