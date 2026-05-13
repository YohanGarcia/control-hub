"use client"

import { cn } from "@/lib/utils"

interface MetricsPillProps {
  label: string
  value: number
  maxValue?: number
  color: "cpu" | "ram" | "disk"
  className?: string
}

export function MetricsPill({ label, value, maxValue = 100, color, className }: MetricsPillProps) {
  const percentage = Math.min((value / maxValue) * 100, 100)

  const colorClasses = {
    cpu: "bg-blue-500/20 text-blue-500 border-blue-500/30",
    ram: "bg-green-500/20 text-green-500 border-green-500/30",
    disk: "bg-purple-500/20 text-purple-500 border-purple-500/30",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        colorClasses[color],
        className
      )}
    >
      <span>{label}</span>
      <span className="font-semibold">{percentage.toFixed(0)}%</span>
    </span>
  )
}