"use client"

import Link from "next/link"
import { Monitor, Cloud, CloudOff } from "lucide-react"
import { StatusBadge } from "./status-badge"
import { MetricsPill } from "./metrics-pill"
import { cn } from "@/lib/utils"
import type { Device, DeviceMetric } from "@/lib/api/devices"

interface DeviceCardProps {
  device: Device
  metric?: DeviceMetric | null
  className?: string
}

export function DeviceCard({ device, metric, className }: DeviceCardProps) {
  return (
    <Link href={`/devices/${device.id}`}>
      <div
        className={cn(
          "p-4 rounded-xl border bg-white hover:shadow-md transition-all cursor-pointer dark:bg-[#101827] dark:border-gray-800",
          className
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
              <Monitor className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">{device.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {device.host_type} {device.os_name && `/ ${device.os_name}`}
              </p>
            </div>
          </div>
          <StatusBadge status={device.is_online ? "online" : "offline"} />
        </div>

        {metric && (
          <div className="flex flex-wrap gap-2">
            <MetricsPill label="CPU" value={metric.cpu_percent} color="cpu" />
            <MetricsPill label="RAM" value={metric.ram_percent} color="ram" />
            <MetricsPill label="DISK" value={metric.disk_percent} color="disk" />
          </div>
        )}

        {!metric && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {device.is_online ? (
              <>
                <Cloud className="h-3 w-3" />
                <span>Sin métricas</span>
              </>
            ) : (
              <>
                <CloudOff className="h-3 w-3" />
                <span>Última vez: {device.last_seen_at ? new Date(device.last_seen_at).toLocaleString() : "Nunca"}</span>
              </>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}