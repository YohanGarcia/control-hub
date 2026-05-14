"use client"

import { useState } from "react"
import { useDevices } from "@/hooks/useDevices"
import { DeviceCard } from "@/components/devices/device-card"
import { LoadingSpinner } from "@/components/shared/loading-spinner"
import { EmptyState } from "@/components/shared/empty-state"
import { DeviceForm } from "@/components/forms/device-form"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Monitor, Search } from "lucide-react"
import { useUIStore } from "@/stores/uiStore"
import { cn } from "@/lib/utils"

export default function DevicesPage() {
  const { data: devices, isLoading, refetch } = useDevices()
  const { sidebarCollapsed } = useUIStore()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all")
  const [hostTypeFilter, setHostTypeFilter] = useState<"all" | "windows" | "ubuntu">("all")
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const filteredDevices = devices?.filter((device) => {
    const matchesSearch = device.name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "online" && device.is_online) ||
      (statusFilter === "offline" && !device.is_online)
    const matchesHostType = hostTypeFilter === "all" || device.host_type === hostTypeFilter

    return matchesSearch && matchesStatus && matchesHostType
  })

  if (isLoading) {
    return <LoadingSpinner message="Cargando dispositivos..." />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dispositivos</h1>
        <p className="text-gray-500">Gestiona y monitorea tus dispositivos</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Buscar dispositivos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 pl-9 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-[#101827] dark:border-gray-700 dark:text-white dark:placeholder:text-gray-500"
          />
        </div>
         <button
           type="button"
           onClick={() => setIsCreateOpen(true)}
           className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
         >
           <Monitor className="mr-2 h-4 w-4" />
           Añadir dispositivo
         </button>
      </div>

      {!filteredDevices || filteredDevices.length === 0 ? (
        <EmptyState
          icon={Monitor}
          title="No hay dispositivos"
          description={
            search || statusFilter !== "all" || hostTypeFilter !== "all"
              ? "No hay dispositivos que coincidan con los filtros"
              : "Añade tu primer dispositivo para comenzar"
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDevices.map((device) => (
            <DeviceCard key={device.id} device={device} />
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir dispositivo</DialogTitle>
            <DialogDescription>Registra un nuevo dispositivo y su clave de agente.</DialogDescription>
          </DialogHeader>
          <DeviceForm
            onCancel={() => setIsCreateOpen(false)}
            onSuccess={async () => {
              await refetch()
              setIsCreateOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
