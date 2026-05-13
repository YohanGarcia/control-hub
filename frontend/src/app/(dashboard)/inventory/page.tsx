"use client"

import { useState } from "react"
import { useDevices } from "@/hooks/useDevices"
import { DeviceCard } from "@/components/devices/device-card"
import { LoadingSpinner } from "@/components/shared/loading-spinner"
import { EmptyState } from "@/components/shared/empty-state"
import { Package, Search, Download } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function InventoryPage() {
  const { data: devices, isLoading } = useDevices()
  const [search, setSearch] = useState("")

  const filteredDevices = devices?.filter((device) =>
    device.name.toLowerCase().includes(search.toLowerCase()) ||
    device.host_type.toLowerCase().includes(search.toLowerCase()) ||
    device.os_name?.toLowerCase().includes(search.toLowerCase())
  )

  if (isLoading) {
    return <LoadingSpinner message="Cargando inventario..." />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inventario</h1>
        <p className="text-muted-foreground">Lista completa de todos los dispositivos</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por nombre, tipo o SO..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </div>

      {!filteredDevices || filteredDevices.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No hay dispositivos"
          description="No hay dispositivos que coincidan con la búsqueda"
        />
      ) : (
        <>
          <div className="text-sm text-muted-foreground">
            {filteredDevices.length} dispositivo{filteredDevices.length !== 1 ? "s" : ""}
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredDevices.map((device) => (
              <DeviceCard key={device.id} device={device} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}