"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Monitor,
  Package,
  Terminal,
  Settings,
  Users,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react"
import { useUIStore } from "@/stores/uiStore"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Dispositivos", href: "/devices", icon: Monitor },
  { name: "Inventario", href: "/inventory", icon: Package },
  { name: "Terminal", href: "/terminal", icon: Terminal },
  { name: "Auditoría", href: "/audit", icon: ScrollText },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Team", href: "/settings/team", icon: Users },
]

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, setMobileMenuOpen } = useUIStore()

  return (
    <>
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen transition-all duration-300",
          "bg-gray-900 border-r border-gray-800",
          "md:z-40",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          sidebarCollapsed ? "md:w-[72px]" : "md:w-[260px]",
          "w-[260px]"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-gray-800 px-4">
            <span className="font-semibold text-white text-lg">
              {sidebarCollapsed ? "CH" : "Control Hub"}
            </span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 text-gray-400 hover:text-white md:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
              const Icon = item.icon

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white",
                    sidebarCollapsed && "justify-center px-2"
                  )}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!sidebarCollapsed && <span>{item.name}</span>}
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-gray-800 p-4">
            <button
              onClick={toggleSidebar}
              className={cn(
                "hidden md:flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors",
              )}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4" />
                  <span>Collapse</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      <div className={cn(
        "transition-all duration-300 hidden md:block",
        sidebarCollapsed ? "ml-[72px]" : "ml-[260px]"
      )} />
    </>
  )
}

export function MobileMenuButton() {
  const { mobileMenuOpen, setMobileMenuOpen } = useUIStore()

  return (
    <button
      onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      className="fixed bottom-4 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg md:hidden"
    >
      {mobileMenuOpen ? (
        <X className="h-6 w-6" />
      ) : (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      )}
    </button>
  )
}