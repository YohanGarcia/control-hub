"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/stores/authStore"
import { useUIStore } from "@/stores/uiStore"
import { MobileBottomNav, Sidebar } from "./sidebar"
import { DeviceServerList } from "./device-server-list"

interface DashboardShellProps {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  const router = useRouter()
  const { refreshSession, hydrated: authHydrated } = useAuthStore()
  const { mobileMenuOpen, setMobileMenuOpen } = useUIStore()

  useEffect(() => {
    if (!authHydrated) return
    refreshSession().then(() => {
      const { isAuthenticated: auth } = useAuthStore.getState()
      if (!auth) router.push("/login")
    })
  }, [authHydrated, router, refreshSession])

  return (
    <div className="dashboard-shell-root" style={{
      display: "flex",
      height: "100%",
      width: "100%",
      overflow: "hidden",
    }}>
      <button
        type="button"
        className="mobile-device-list-btn"
        onClick={() => setMobileMenuOpen(true)}
        aria-label="Ver dispositivos"
      >
        <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="7" rx="1.5" />
          <rect x="3" y="13" width="18" height="7" rx="1.5" />
          <path d="M7 7.5h.01M7 16.5h.01" />
        </svg>
        Dispositivos
      </button>

      {mobileMenuOpen && (
        <div className="mobile-device-list-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-device-list-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-device-list-grab" />
            <DeviceServerList />
          </div>
        </div>
      )}

      <div className="dashboard-sidebar-wrap">
        <Sidebar/>
      </div>
      <DeviceServerList/>
      <main
        className="ch-scroll dashboard-main"
        style={{
          flex: 1,
          overflowY: "auto",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        {children}
      </main>
      <MobileBottomNav />
    </div>
  )
}
