"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useDevices } from "@/hooks/useDevices"
import { useUIStore } from "@/stores/uiStore"
import { DeviceForm } from "@/components/forms/device-form"
import type { Device } from "@/lib/api/devices"

function StatusDot({ online }: { online: boolean }) {
  const c = online ? "var(--green)" : "var(--red)"
  return (
    <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8, flexShrink: 0 }}>
      <span
        className={online ? "pulse" : ""}
        style={{ position: "absolute", inset: 0, borderRadius: "50%", background: c, boxShadow: `0 0 8px ${c}` }}
      />
    </span>
  )
}

function DeviceIcon({ hostType, active }: { hostType: string; active: boolean }) {
  const color = active ? "var(--blue-2)" : "var(--text-2)"
  if (hostType === "ubuntu" || hostType === "linux") {
    return (
      <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, color }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="8" ry="3"/>
        <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/>
        <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, color }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="7" rx="1.5"/>
      <rect x="3" y="13" width="18" height="7" rx="1.5"/>
      <path d="M7 7.5h.01M7 16.5h.01"/>
    </svg>
  )
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" style={{ width: 13, height: 13 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>
    </svg>
  )
}

const FAVORITES = [
  { n: "staging-eu", icon: "cube" },
  { n: "kube-runner", icon: "cube" },
]

function getDeviceHref(device: Device, pathname: string): string {
  if (pathname.startsWith("/terminal")) return `/terminal/${device.id}`
  return `/devices/${device.id}`
}

export function DeviceServerList() {
  const [query, setQuery] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { setActiveDeviceId } = useUIStore()
  const { data: devices, isLoading } = useDevices()

  const filtered = (devices ?? []).filter((d) =>
    d.name.toLowerCase().includes(query.toLowerCase()) ||
    (d.os_name ?? "").toLowerCase().includes(query.toLowerCase())
  )

  const activeIdMatch = pathname.match(/\/(?:devices|terminal)\/(\d+)/)
  const activeId = activeIdMatch ? parseInt(activeIdMatch[1], 10) : null

  function handleSelect(device: Device) {
    setActiveDeviceId(device.id)
    router.push(getDeviceHref(device, pathname))
  }

  return (
    <>
    <div style={{
      width: 260,
      display: "flex",
      flexDirection: "column",
      background: "rgba(10,14,26,0.65)",
      borderRight: "1px solid var(--line)",
      height: "100%",
      flexShrink: 0,
    }}>
      {/* Session header + search */}
      <div style={{ padding: "14px 14px 8px" }}>
        <div style={{ fontSize: 10, letterSpacing: 1.3, color: "var(--text-3)", fontWeight: 600, marginBottom: 8 }}>
          SESIÓN ACTIVA
        </div>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-3)", display: "inline-flex" }}>
            <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
            </svg>
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar sesiones…"
            className="ring-blue"
            style={{
              width: "100%",
              padding: "8px 10px 8px 32px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              color: "var(--text)",
              fontSize: 13,
              outline: "none",
            }}
          />
          <span className="mono" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "var(--text-4)", fontSize: 11 }}>
            ⌘K
          </span>
        </div>
      </div>

      {/* Count header + add button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px 6px" }}>
        <div style={{ fontSize: 10, letterSpacing: 1.3, color: "var(--text-3)", fontWeight: 600 }}>
          SERVIDORES · {filtered.length}
        </div>
        <button
          title="Nueva conexión"
          onClick={() => setShowCreate(true)}
          style={{
            width: 22, height: 22, borderRadius: 6,
            border: "1px solid var(--line)",
            background: "rgba(255,255,255,0.02)",
            color: "var(--text-2)",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(59,130,246,0.5)"
            e.currentTarget.style.background = "rgba(59,130,246,0.08)"
            e.currentTarget.style.color = "var(--blue-2)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--line)"
            e.currentTarget.style.background = "rgba(255,255,255,0.02)"
            e.currentTarget.style.color = "var(--text-2)"
          }}
        >
          <svg viewBox="0 0 24 24" style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      </div>

      {/* Device list */}
      <div className="ch-scroll" style={{ flex: 1, overflowY: "auto", padding: "0 8px 10px" }}>
        {isLoading ? (
          <div style={{ padding: "20px 10px", color: "var(--text-3)", fontSize: 13, textAlign: "center" }}>
            Cargando…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "20px 10px", color: "var(--text-3)", fontSize: 13, textAlign: "center" }}>
            {query ? "Sin resultados" : "Sin servidores"}
          </div>
        ) : (
          filtered.map((device) => {
            const on = device.id === activeId
            const statusColor = device.is_online ? "var(--green)" : "var(--red)"
            const statusLabel = device.is_online ? "En línea" : "Desconectado"
            return (
              <button
                key={device.id}
                onClick={() => handleSelect(device)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 10px",
                  background: on
                    ? "linear-gradient(180deg, rgba(59,130,246,0.16), rgba(59,130,246,0.06))"
                    : "transparent",
                  border: on ? "1px solid rgba(59,130,246,0.55)" : "1px solid transparent",
                  borderRadius: 10,
                  marginBottom: 4,
                  cursor: "pointer",
                  color: "var(--text)",
                  textAlign: "left",
                  boxShadow: on ? "0 0 22px rgba(59,130,246,0.22), inset 0 0 12px rgba(59,130,246,0.10)" : "none",
                  transition: "background 160ms, border-color 160ms",
                }}
                onMouseEnter={(e) => {
                  if (!on) e.currentTarget.style.background = "rgba(255,255,255,0.03)"
                }}
                onMouseLeave={(e) => {
                  if (!on) e.currentTarget.style.background = "transparent"
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: on ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.04)",
                  display: "grid", placeItems: "center", flexShrink: 0,
                  border: "1px solid var(--line)",
                }}>
                  <DeviceIcon hostType={device.host_type} active={on} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: "#fff",
                    textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap",
                  }}>
                    {device.name}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                    <StatusDot online={device.is_online}/>
                    <span style={{ color: statusColor }}>{statusLabel}</span>
                    <span style={{ color: "var(--text-4)" }}>· 0ms</span>
                  </div>
                </div>
              </button>
            )
          })
        )}

        {/* Divider + Favorites */}
        <div style={{ height: 1, background: "var(--line)", margin: "10px 6px" }}/>
        <div style={{ fontSize: 10, letterSpacing: 1.3, color: "var(--text-3)", fontWeight: 600, padding: "4px 8px 8px" }}>
          FAVORITOS
        </div>
        {FAVORITES.map((f) => (
          <div
            key={f.n}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 10px", borderRadius: 8,
              color: "var(--text-2)", fontSize: 13, cursor: "pointer",
              transition: "background 160ms",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <StarIcon/>
            <span style={{ color: "var(--text-2)" }}>{f.n}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Device creation modal */}
    {showCreate && (
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(5,8,18,0.75)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
        onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false) }}
      >
        <div style={{
          width: 480, maxWidth: "calc(100vw - 32px)",
          background: "linear-gradient(180deg, rgba(20,27,49,0.98), rgba(13,18,34,0.98))",
          border: "1px solid var(--line)",
          borderRadius: 16, overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.08)",
        }}>
          {/* Modal header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid var(--line)" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Nueva conexión</div>
              <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>Registra un nuevo servidor o dispositivo</div>
            </div>
            <button
              onClick={() => setShowCreate(false)}
              style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid var(--line)", color: "var(--text-3)", cursor: "pointer", display: "grid", placeItems: "center" }}
            >
              <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          {/* Modal body */}
          <div style={{ padding: 20 }}>
            <DeviceForm
              onSuccess={(device) => {
                setShowCreate(false)
                router.push(`/devices/${device.id}`)
              }}
              onCancel={() => setShowCreate(false)}
            />
          </div>
        </div>
      </div>
    )}
    </>
  )
}
