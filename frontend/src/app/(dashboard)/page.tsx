"use client"

import { useDevices } from "@/hooks/useDevices"
import { StatCard } from "@/components/dashboard/stat-card"
import { DevicesTable } from "@/components/dashboard/devices-table"
import { LoadingSpinner } from "@/components/shared/loading-spinner"
import { Server, Wifi, WifiOff, AlertTriangle } from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  const { data: devices, isLoading } = useDevices()

  const totalDevices = devices?.length ?? 0
  const onlineDevices = devices?.filter((d) => d.is_online).length ?? 0
  const offlineDevices = totalDevices - onlineDevices

  if (isLoading) {
    return <LoadingSpinner message="Cargando dashboard..." />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Resumen de tu infraestructura</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Dispositivos"
          value={totalDevices}
          icon={Server}
          className="border-l-4 border-l-blue-500"
        />
        <StatCard
          title="Online"
          value={onlineDevices}
          icon={Wifi}
          className="border-l-4 border-l-green-500"
          trend={
            totalDevices > 0
              ? {
                  value: Math.round((onlineDevices / totalDevices) * 100),
                  label: "Disponibilidad",
                }
              : undefined
          }
        />
        <StatCard
          title="Offline"
          value={offlineDevices}
          icon={WifiOff}
          className="border-l-4 border-l-red-500"
        />
        <StatCard
          title="Alertas"
          value={0}
          icon={AlertTriangle}
          className="border-l-4 border-l-yellow-500"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Dispositivos Recientes</h2>
          <Link
            href="/devices"
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            Ver todos →
          </Link>
        </div>
        <DevicesTable devices={devices?.slice(0, 5) ?? []} />
      </div>
    </div>
  )
}
