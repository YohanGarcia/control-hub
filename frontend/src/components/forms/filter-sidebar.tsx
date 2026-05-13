"use client"

import { Search, Wifi, WifiOff, Monitor } from "lucide-react"
import { cn } from "@/lib/utils"

interface FilterSidebarProps {
  search: string
  onSearchChange: (value: string) => void
  statusFilter: "all" | "online" | "offline"
  onStatusFilterChange: (value: "all" | "online" | "offline") => void
  hostTypeFilter: "all" | "windows" | "ubuntu"
  onHostTypeFilterChange: (value: "all" | "windows" | "ubuntu") => void
  className?: string
}

export function FilterSidebar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  hostTypeFilter,
  onHostTypeFilterChange,
  className
}: FilterSidebarProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Buscar dispositivos..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 pl-9 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-[#101827] dark:border-gray-700 dark:text-white dark:placeholder:text-gray-500"
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3">Estado</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="status"
              value="all"
              checked={statusFilter === "all"}
              onChange={() => onStatusFilterChange("all")}
              className="text-blue-500"
            />
            <span className="text-sm">Todos</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="status"
              value="online"
              checked={statusFilter === "online"}
              onChange={() => onStatusFilterChange("online")}
              className="text-blue-500"
            />
            <Wifi className="h-4 w-4 text-green-500" />
            <span className="text-sm">Online</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="status"
              value="offline"
              checked={statusFilter === "offline"}
              onChange={() => onStatusFilterChange("offline")}
              className="text-blue-500"
            />
            <WifiOff className="h-4 w-4 text-red-500" />
            <span className="text-sm">Offline</span>
          </label>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3">Tipo de Host</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="hostType"
              value="all"
              checked={hostTypeFilter === "all"}
              onChange={() => onHostTypeFilterChange("all")}
              className="text-blue-500"
            />
            <span className="text-sm">Todos</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="hostType"
              value="ubuntu"
              checked={hostTypeFilter === "ubuntu"}
              onChange={() => onHostTypeFilterChange("ubuntu")}
              className="text-blue-500"
            />
            <Monitor className="h-4 w-4 text-orange-500" />
            <span className="text-sm">Ubuntu / Linux</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="hostType"
              value="windows"
              checked={hostTypeFilter === "windows"}
              onChange={() => onHostTypeFilterChange("windows")}
              className="text-blue-500"
            />
            <Monitor className="h-4 w-4 text-blue-500" />
            <span className="text-sm">Windows</span>
          </label>
        </div>
      </div>
    </div>
  )
}