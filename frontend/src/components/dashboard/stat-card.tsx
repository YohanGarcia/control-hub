"use client"

import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    label: string
  }
  className?: string
}

export function StatCard({ title, value, icon: Icon, trend, className }: StatCardProps) {
  const trendIsPositive = trend && trend.value > 0
  const trendIsNegative = trend && trend.value < 0

  return (
    <div
      className={cn(
        "rounded-xl border bg-white p-4 md:p-6 dark:bg-[#101827] dark:border-gray-800",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl md:text-3xl font-bold mt-2 text-gray-900 dark:text-white">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trendIsPositive && <TrendingUp className="h-4 w-4 text-green-500" />}
              {trendIsNegative && <TrendingDown className="h-4 w-4 text-red-500" />}
              {!trendIsPositive && !trendIsNegative && <Minus className="h-4 w-4 text-gray-500" />}
              <span
                className={cn(
                  "text-sm font-medium",
                  trendIsPositive && "text-green-500",
                  trendIsNegative && "text-red-500",
                  !trendIsPositive && !trendIsNegative && "text-gray-500"
                )}
              >
                {trend.value > 0 ? "+" : ""}
                {trend.value}%
              </span>
              <span className="text-xs text-gray-400 ml-1">{trend.label}</span>
            </div>
          )}
        </div>
        <div className="rounded-lg bg-blue-500/10 p-3">
          <Icon className="h-6 w-6 text-blue-500" />
        </div>
      </div>
    </div>
  )
}