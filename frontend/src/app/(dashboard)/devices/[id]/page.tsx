"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { useDevice, useDeviceStatus, useDeviceMetrics, useDeviceActions, useDeviceActionHistory } from "@/hooks/useDevices"
import { LoadingSpinner } from "@/components/shared/loading-spinner"
import { ErrorModal } from "@/components/shared/error-modal"
import { EmptyState } from "@/components/shared/empty-state"
import { MetricChart } from "@/components/dashboard/metric-chart"
import { StatusBadge } from "@/components/devices/status-badge"
import { MetricsPill } from "@/components/devices/metrics-pill"
import { Monitor, ArrowLeft, Terminal, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatUptime } from "@/lib/utils"

export default function DeviceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const deviceId = parseInt(id, 10)

  const { data: device, isLoading, error } = useDevice(deviceId)
  const { data: deviceStatus } = useDeviceStatus(deviceId)
  const { data: metrics } = useDeviceMetrics(deviceId, { limit: 20 })
  const { data: actions } = useDeviceActions(deviceId)
  const { data: actionHistory } = useDeviceActionHistory(deviceId)

  const [selectedTab, setSelectedTab] = useState("overview")

  if (isLoading) {
    return <LoadingSpinner message="Cargando dispositivo..." />
  }

  if (error || !device) {
    return (
      <ErrorModal
        open={true}
        onClose={() => router.push("/devices")}
        onRetry={() => window.location.reload()}
        title="Error al cargar"
        message="No se pudo cargar la información del dispositivo"
      />
    )
  }

  const latestMetric = deviceStatus?.latest_metric

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{device.name}</h1>
            <StatusBadge status={device.is_online ? "online" : "offline"} />
          </div>
          <p className="text-muted-foreground text-sm">
            {device.host_type} {device.os_name && `/ ${device.os_name}`}
            {device.agent_version && ` • v${device.agent_version}`}
          </p>
        </div>
        <Button asChild>
          <a href={`/terminal/${device.id}`}>
            <Terminal className="mr-2 h-4 w-4" />
            Terminal
          </a>
        </Button>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
          <TabsTrigger value="actions">Acciones</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">CPU</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {latestMetric ? `${latestMetric.cpu_percent.toFixed(1)}%` : "-"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">RAM</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {latestMetric ? `${latestMetric.ram_percent.toFixed(1)}%` : "-"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Disco</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {latestMetric ? `${latestMetric.disk_percent.toFixed(1)}%` : "-"}
                </div>
              </CardContent>
            </Card>
          </div>

          {latestMetric && (
            <Card>
              <CardHeader>
                <CardTitle>Métricas actuales</CardTitle>
                <CardDescription>Actualizado hace unos segundos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <MetricsPill label="CPU" value={latestMetric.cpu_percent} color="cpu" />
                  <MetricsPill label="RAM" value={latestMetric.ram_percent} color="ram" />
                  <MetricsPill label="DISK" value={latestMetric.disk_percent} color="disk" />
                  <span className="text-sm text-muted-foreground px-2">
                    Uptime: {formatUptime(latestMetric.uptime_seconds)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          {metrics && metrics.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <MetricChart data={metrics} metric="cpu" />
              <MetricChart data={metrics} metric="ram" />
              <MetricChart data={metrics} metric="disk" className="lg:col-span-2" />
            </div>
          ) : (
            <EmptyState
              icon={Monitor}
              title="Sin métricas"
              description="No hay datos de métricas disponibles para este dispositivo"
            />
          )}
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          {actions && actions.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {actions.map((action) => (
                <Card key={action.id} className="cursor-pointer hover:border-blue-500 transition-colors">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{action.name}</CardTitle>
                    <CardDescription>{action.slug}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" disabled={!device.is_online}>
                      <Play className="mr-2 h-4 w-4" />
                      Ejecutar
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Play}
              title="Sin acciones"
              description="No hay acciones disponibles para este dispositivo"
            />
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {actionHistory && actionHistory.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {actionHistory.map((run) => (
                    <div key={run.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">Acción #{run.action_id}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(run.created_at).toLocaleString()}
                        </p>
                      </div>
                      <StatusBadge
                        status={run.status === "succeeded" ? "online" : run.status === "failed" ? "error" : "pending"}
                        label={run.status}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={Monitor}
              title="Sin historial"
              description="No hay ejecuciones registradas para este dispositivo"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}