"use client"

import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: "online" | "offline" | "running" | "pending" | "error"
  label?: string
  className?: string
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const statusConfig = {
    online: {
      bg: "bg-green-500/20",
      text: "text-green-500",
      dot: "bg-green-500",
      defaultLabel: "Online",
    },
    offline: {
      bg: "bg-red-500/20",
      text: "text-red-500",
      dot: "bg-red-500",
      defaultLabel: "Offline",
    },
    running: {
      bg: "bg-blue-500/20",
      text: "text-blue-500",
      dot: "bg-blue-500 animate-pulse",
      defaultLabel: "Running",
    },
    pending: {
      bg: "bg-yellow-500/20",
      text: "text-yellow-500",
      dot: "bg-yellow-500",
      defaultLabel: "Pending",
    },
    error: {
      bg: "bg-red-500/20",
      text: "text-red-500",
      dot: "bg-red-500",
      defaultLabel: "Error",
    },
  }

  const config = statusConfig[status]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.bg,
        config.text,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {label || config.defaultLabel}
    </span>
  )
}