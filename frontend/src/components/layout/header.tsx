"use client"

import { Bell, Search, Sun, Moon, Monitor, LogOut, Menu } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useUIStore } from "@/stores/uiStore"
import { useAuthStore } from "@/stores/authStore"
import { useThemeApp } from "@/hooks/useTheme"
import { useState } from "react"

export function Header() {
  const { toggleNotifications, setMobileMenuOpen } = useUIStore()
  const { toggleTheme, resolvedTheme, getThemeIcon, mounted } = useThemeApp()
  const { logout } = useAuthStore()

  const ThemeIcon = {
    Sun,
    Moon,
    Monitor,
  }[getThemeIcon() as "Sun" | "Moon" | "Monitor"]

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 dark:bg-[#0B1120] dark:border-gray-800">
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex flex-1 items-center gap-4">
        <div className="relative flex-1 max-w-md hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Buscar dispositivos..."
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 pl-9 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-[#101827] dark:border-gray-700 dark:text-white dark:placeholder:text-gray-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {mounted && (
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <ThemeIcon className="h-5 w-5" />
          </button>
        )}

        <button
          onClick={toggleNotifications}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 relative"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
        </button>

        <button
          onClick={() => logout()}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <LogOut className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 ml-2">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-blue-600 text-white text-sm">
              U
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}