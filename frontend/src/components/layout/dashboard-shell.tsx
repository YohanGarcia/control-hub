"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/stores/authStore"
import { Sidebar } from "./sidebar"
import { DeviceServerList } from "./device-server-list"

interface DashboardShellProps {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  const router = useRouter()
  const { refreshSession, hydrated: authHydrated } = useAuthStore()

  useEffect(() => {
    if (!authHydrated) return
    refreshSession().then(() => {
      const { isAuthenticated: auth } = useAuthStore.getState()
      if (!auth) router.push("/login")
    })
  }, [authHydrated, router, refreshSession])

  return (
    <div style={{
      display: "flex",
      height: "100%",
      width: "100%",
      overflow: "hidden",
    }}>
      <Sidebar/>
      <DeviceServerList/>
      <main
        className="ch-scroll"
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
    </div>
  )
}
