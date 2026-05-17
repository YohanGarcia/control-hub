"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useUIStore } from "@/stores/uiStore"
import { useDevices } from "@/hooks/useDevices"
import { useAuthStore } from "@/stores/authStore"

const NAV_ITEMS = [
  {
    id: "devices",
    label: "Dispositivos",
    href: "/devices",
    icon: (
      <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, flexShrink: 0 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z"/>
      </svg>
    ),
  },
  {
    id: "metrics",
    label: "Métricas",
    href: "/",
    icon: (
      <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, flexShrink: 0 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 20V4M3 20h18"/><path d="M7 16l4-5 3 3 5-7"/>
      </svg>
    ),
  },
  {
    id: "terminal",
    label: "Terminal",
    href: "/terminal",
    icon: (
      <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, flexShrink: 0 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h16v12H4z"/><path d="M7 10l3 2-3 2"/><path d="M13 14h4"/>
      </svg>
    ),
  },
  {
    id: "ops",
    label: "Ops Center",
    href: "/ops",
    icon: (
      <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, flexShrink: 0 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 0112 0c0 7 3 7 3 9H3c0-2 3-2 3-9z"/><path d="M10 21a2 2 0 004 0"/>
      </svg>
    ),
  },
  {
    id: "settings",
    label: "Ajustes",
    href: "/settings",
    icon: (
      <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, flexShrink: 0 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1A2 2 0 113.4 17l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H2a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8L3.2 7a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H8a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1A2 2 0 1120.8 7l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H22a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>
      </svg>
    ),
  },
]

function LogoIcon() {
  return (
    <svg viewBox="0 0 24 24" style={{ width: 32, height: 32, flexShrink: 0 }}>
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#60a5fa"/><stop offset="1" stopColor="#8b5cf6"/>
        </linearGradient>
      </defs>
      <path d="M4 7 L12 3 L20 7 L20 17 L12 21 L4 17 Z" fill="url(#logo-grad)" opacity="0.18" stroke="url(#logo-grad)" strokeWidth="1.6"/>
      <path d="M4 7 L12 11 L20 7" stroke="url(#logo-grad)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 11 L12 21" stroke="url(#logo-grad)" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { railExpanded, toggleRail, activeDeviceId } = useUIStore()
  const { data: devices } = useDevices()
  const { logout } = useAuthStore()

  async function handleLogout() {
    await logout()
    router.push("/login")
  }

  const W = railExpanded ? 200 : 56
  const resolvedDeviceId = activeDeviceId ?? devices?.[0]?.id

  function resolveHref(item: typeof NAV_ITEMS[0]): string {
    if (item.id === "terminal") return resolvedDeviceId ? `/terminal/${resolvedDeviceId}` : "/terminal"
    if (item.id === "devices") return resolvedDeviceId ? `/devices/${resolvedDeviceId}` : "/devices"
    return item.href
  }

  function isActive(item: typeof NAV_ITEMS[0]) {
    if (item.id === "metrics") return pathname === "/"
    if (item.id === "terminal") return pathname.startsWith("/terminal")
    if (item.id === "devices") return pathname.startsWith("/devices")
    return pathname.startsWith(item.href)
  }

  return (
    <div style={{
      width: W,
      display: "flex",
      flexDirection: "column",
      alignItems: "stretch",
      padding: "14px 10px 12px",
      gap: 4,
      background: "rgba(7,10,20,0.6)",
      borderRight: "1px solid var(--line)",
      transition: "width 220ms cubic-bezier(.4,.2,.2,1)",
      overflow: "hidden",
      flexShrink: 0,
      height: "100%",
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 2px", marginBottom: 8, height: 36 }}>
        <div style={{ width: 36, height: 36, display: "grid", placeItems: "center", flexShrink: 0 }}>
          <LogoIcon/>
        </div>
        {railExpanded && (
          <div style={{ display: "flex", flexDirection: "column", whiteSpace: "nowrap", overflow: "hidden" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", lineHeight: 1.1 }}>Control Center</span>
            <span style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: 0.4 }}>v2.4.1</span>
          </div>
        )}
      </div>

      {/* Nav items */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
        {NAV_ITEMS.map((item) => {
          const on = isActive(item)
          return (
            <Link
              key={item.id}
              href={resolveHref(item)}
              title={!railExpanded ? item.label : undefined}
              style={{
                width: "100%",
                height: 36,
                borderRadius: 9,
                background: on ? "rgba(59,130,246,0.16)" : "transparent",
                border: on ? "1px solid rgba(59,130,246,0.5)" : "1px solid transparent",
                color: on ? "#fff" : "var(--text-3)",
                boxShadow: on ? "0 0 18px rgba(59,130,246,0.35), inset 0 0 12px rgba(59,130,246,0.15)" : "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: railExpanded ? "0 10px" : 0,
                justifyContent: railExpanded ? "flex-start" : "center",
                transition: "all 160ms ease",
                fontSize: 13,
                fontWeight: 500,
                textDecoration: "none",
              }}
              onMouseEnter={(e) => {
                if (!on) (e.currentTarget as HTMLElement).style.color = "var(--text)"
              }}
              onMouseLeave={(e) => {
                if (!on) (e.currentTarget as HTMLElement).style.color = "var(--text-3)"
              }}
            >
              {item.icon}
              {railExpanded && <span style={{ whiteSpace: "nowrap" }}>{item.label}</span>}
            </Link>
          )
        })}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleRail}
        title={railExpanded ? "Contraer" : "Expandir"}
        style={{
          width: "100%",
          height: 30,
          borderRadius: 8,
          marginBottom: 8,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid var(--line)",
          color: "var(--text-3)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: railExpanded ? "space-between" : "center",
          gap: 8,
          padding: railExpanded ? "0 10px" : 0,
          fontSize: 12,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--text)"
          e.currentTarget.style.borderColor = "var(--line-strong)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--text-3)"
          e.currentTarget.style.borderColor = "var(--line)"
        }}
      >
        {railExpanded && <span>Contraer</span>}
        <svg
          viewBox="0 0 24 24"
          style={{
            width: 14, height: 14,
            transform: railExpanded ? "rotate(180deg)" : "none",
            transition: "transform 220ms",
            fill: "none", stroke: "currentColor", strokeWidth: 1.6,
            strokeLinecap: "round", strokeLinejoin: "round",
            flexShrink: 0,
          }}
        >
          <path d="M9 6l6 6-6 6"/>
        </svg>
      </button>

      {/* User avatar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: railExpanded ? "8px 6px 4px" : "8px 0 4px",
        borderTop: "1px solid var(--line)",
        justifyContent: railExpanded ? "flex-start" : "center",
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: "50%",
          background: "linear-gradient(135deg,#3b82f6,#8b5cf6)",
          display: "grid", placeItems: "center",
          fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0,
        }}>
          AD
        </div>
        {railExpanded && (
          <div style={{ display: "flex", flexDirection: "column", whiteSpace: "nowrap", overflow: "hidden", minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#fff", lineHeight: 1.15 }}>Administrador</span>
            <span style={{ fontSize: 10, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis" }}>
              admin@controlcenter.io
            </span>
          </div>
        )}
        {railExpanded && (
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            style={{
              width: 28, height: 28, borderRadius: 7, flexShrink: 0,
              background: "transparent", border: "1px solid transparent",
              color: "var(--text-3)", cursor: "pointer",
              display: "grid", placeItems: "center",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--red)"
              e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"
              e.currentTarget.style.background = "rgba(239,68,68,0.08)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-3)"
              e.currentTarget.style.borderColor = "transparent"
              e.currentTarget.style.background = "transparent"
            }}
          >
            <svg viewBox="0 0 24 24" style={{ width: 15, height: 15 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        )}
      </div>

      {/* Logout (collapsed mode) */}
      {!railExpanded && (
        <button
          onClick={handleLogout}
          title="Cerrar sesión"
          style={{
            width: "100%", height: 30, borderRadius: 8,
            background: "transparent", border: "1px solid transparent",
            color: "var(--text-4)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--red)"
            e.currentTarget.style.borderColor = "rgba(239,68,68,0.25)"
            e.currentTarget.style.background = "rgba(239,68,68,0.06)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-4)"
            e.currentTarget.style.borderColor = "transparent"
            e.currentTarget.style.background = "transparent"
          }}
        >
          <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
        </button>
      )}
    </div>
  )
}

export function MobileSidebarMenu() {
  const pathname = usePathname()
  const router = useRouter()
  const { activeDeviceId, setMobileMenuOpen } = useUIStore()
  const { data: devices } = useDevices()
  const { logout } = useAuthStore()

  const resolvedDeviceId = activeDeviceId ?? devices?.[0]?.id

  function resolveHref(item: typeof NAV_ITEMS[0]): string {
    if (item.id === "terminal") return resolvedDeviceId ? `/terminal/${resolvedDeviceId}` : "/terminal"
    if (item.id === "devices") return resolvedDeviceId ? `/devices/${resolvedDeviceId}` : "/devices"
    return item.href
  }

  function isActive(item: typeof NAV_ITEMS[0]) {
    if (item.id === "metrics") return pathname === "/"
    if (item.id === "terminal") return pathname.startsWith("/terminal")
    if (item.id === "devices") return pathname.startsWith("/devices")
    return pathname.startsWith(item.href)
  }

  async function handleLogout() {
    await logout()
    setMobileMenuOpen(false)
    router.push("/login")
  }

  return (
    <nav style={{ display: "flex", flexDirection: "column", height: "100%", padding: 14, gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 10, borderBottom: "1px solid var(--line)" }}>
        <LogoIcon />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", lineHeight: 1.1 }}>Control Center</span>
          <span style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: 0.4 }}>Menu movil</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8, flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const on = isActive(item)
          return (
            <Link
              key={`mobile-${item.id}`}
              href={resolveHref(item)}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                width: "100%",
                minHeight: 42,
                borderRadius: 10,
                background: on ? "rgba(59,130,246,0.16)" : "transparent",
                border: on ? "1px solid rgba(59,130,246,0.5)" : "1px solid var(--line)",
                color: on ? "#fff" : "var(--text-2)",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "0 12px",
                fontSize: 13,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>

      <button
        onClick={handleLogout}
        style={{
          width: "100%",
          height: 36,
          borderRadius: 9,
          border: "1px solid rgba(239,68,68,0.35)",
          background: "rgba(239,68,68,0.08)",
          color: "#fca5a5",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        Cerrar sesion
      </button>
    </nav>
  )
}

export function MobileBottomNav() {
  const pathname = usePathname()
  const { activeDeviceId } = useUIStore()
  const { data: devices } = useDevices()

  const resolvedDeviceId = activeDeviceId ?? devices?.[0]?.id

  function resolveHref(item: typeof NAV_ITEMS[0]): string {
    if (item.id === "terminal") return resolvedDeviceId ? `/terminal/${resolvedDeviceId}` : "/terminal"
    if (item.id === "devices") return resolvedDeviceId ? `/devices/${resolvedDeviceId}` : "/devices"
    return item.href
  }

  function isActive(item: typeof NAV_ITEMS[0]) {
    if (item.id === "metrics") return pathname === "/"
    if (item.id === "terminal") return pathname.startsWith("/terminal")
    if (item.id === "devices") return pathname.startsWith("/devices")
    return pathname.startsWith(item.href)
  }

  const items = NAV_ITEMS.filter((item) => ["devices", "metrics", "terminal", "ops"].includes(item.id))

  return (
    <nav className="mobile-bottom-nav" aria-label="Navegacion movil">
      {items.map((item) => {
        const on = isActive(item)
        return (
          <Link
            key={`bottom-${item.id}`}
            href={resolveHref(item)}
            className={`mobile-bottom-nav-item${on ? " active" : ""}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export function MobileMenuButton() { return null }
