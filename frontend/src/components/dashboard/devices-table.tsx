"use client"

import Link from "next/link"
import { Monitor } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/devices/status-badge"
import type { Device } from "@/lib/api/devices"

interface DevicesTableProps {
  devices: Device[]
  className?: string
}

export function DevicesTable({ devices, className }: DevicesTableProps) {
  if (devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <Monitor className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm">No hay dispositivos</p>
      </div>
    )
  }

  return (
    <div className={className}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Sistema Operativo</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Última Conexión</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {devices.map((device) => (
            <TableRow key={device.id}>
              <TableCell>
                <Link
                  href={`/devices/${device.id}`}
                  className="font-medium hover:text-blue-500"
                >
                  {device.name}
                </Link>
              </TableCell>
              <TableCell className="capitalize">{device.host_type}</TableCell>
              <TableCell className="text-muted-foreground">
                {device.os_name || "—"}
              </TableCell>
              <TableCell>
                <StatusBadge status={device.is_online ? "online" : "offline"} />
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {device.last_seen_at
                  ? new Date(device.last_seen_at).toLocaleString()
                  : "Nunca"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}