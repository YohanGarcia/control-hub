"use client"

import { useMemo } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { cn } from "@/lib/utils"
import type { DeviceMetric } from "@/lib/api/devices"

interface MetricChartProps {
  data: DeviceMetric[]
  metric: "cpu" | "ram" | "disk"
  className?: string
}

const metricConfig = {
  cpu: {
    dataKey: "cpu_percent",
    color: "#3B82F6",
    gradientId: "colorCpu",
    label: "CPU %",
  },
  ram: {
    dataKey: "ram_percent",
    color: "#22C55E",
    gradientId: "colorRam",
    label: "RAM %",
  },
  disk: {
    dataKey: "disk_percent",
    color: "#A855F7",
    gradientId: "colorDisk",
    label: "Disk %",
  },
}

export function MetricChart({ data, metric, className }: MetricChartProps) {
  const config = metricConfig[metric]

  const chartData = useMemo(() => {
    return data.map((d) => ({
      time: new Date(d.created_at).toLocaleTimeString(),
      value: d[config.dataKey as keyof DeviceMetric] as number,
    }))
  }, [data, config.dataKey])

  return (
    <div className={cn("rounded-xl border p-4 bg-white dark:bg-[#101827] border-gray-200 dark:border-white/10", className)}>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={config.gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={config.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="time" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={config.color}
            strokeWidth={2}
            fillOpacity={1}
            fill={`url(#${config.gradientId})`}
            name={config.label}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}