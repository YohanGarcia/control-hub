"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useDevices } from "@/hooks/useDevices"
import { useUIStore } from "@/stores/uiStore"

export default function DashboardPage() {
  const router = useRouter()
  const { data: devices, isLoading } = useDevices()
  const { activeDeviceId } = useUIStore()

  useEffect(() => {
    if (isLoading) return
    const targetId = activeDeviceId ?? devices?.[0]?.id
    if (targetId) {
      router.replace(`/devices/${targetId}`)
    }
  }, [isLoading, devices, activeDeviceId, router])

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--ch-text-3)", fontSize: 14 }}>
      {isLoading ? "Cargando…" : "Selecciona un dispositivo"}
    </div>
  )
}
