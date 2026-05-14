"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useDevices } from "@/hooks/useDevices"
import type { Device } from "@/lib/api/devices"

function StatusDot({ online }: { online: boolean }) {
  const c = online ? "var(--ch-green)" : "var(--ch-red)"
  return (
    <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8, flexShrink: 0 }}>
      <span className={online ? "pulse" : ""} style={{ position: "absolute", inset: 0, borderRadius: "50%", background: c, boxShadow: `0 0 6px ${c}` }} />
    </span>
  )
}

const OS_ICONS: Record<string, React.ReactNode> = {
  ubuntu: (
    <svg viewBox="0 0 24 24" style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/>
    </svg>
  ),
  windows: (
    <svg viewBox="0 0 24 24" style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/>
    </svg>
  ),
}

function DeviceRow({ device }: { device: Device }) {
  const icon = OS_ICONS[device.host_type] ?? (
    <svg viewBox="0 0 24 24" style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="7" rx="1.5"/><rect x="3" y="13" width="18" height="7" rx="1.5"/><path d="M7 7.5h.01M7 16.5h.01"/>
    </svg>
  )

  return (
    <Link
      href={`/devices/${device.id}`}
      style={{ textDecoration: "none" }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr auto auto auto",
          alignItems: "center",
          gap: 16,
          padding: "14px 20px",
          borderBottom: "1px solid var(--line)",
          transition: "background 120ms",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)" }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent" }}
      >
        {/* Icon */}
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)",
          display: "grid", placeItems: "center", color: "var(--ch-blue-2)",
        }}>
          {icon}
        </div>

        {/* Name + info */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {device.name}
          </span>
          <span style={{ fontSize: 11.5, color: "var(--ch-text-3)" }}>
            {device.os_name ?? device.host_type}
          </span>
        </div>

        {/* Agent version */}
        {device.agent_version ? (
          <span className="mono" style={{ fontSize: 11, color: "var(--ch-text-4)", padding: "3px 9px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid var(--line)", whiteSpace: "nowrap" }}>
            v{device.agent_version}
          </span>
        ) : (
          <span style={{ fontSize: 11, color: "var(--ch-text-4)", width: 1 }} />
        )}

        {/* Last seen */}
        <span style={{ fontSize: 11.5, color: "var(--ch-text-3)", whiteSpace: "nowrap" }}>
          {device.last_seen_at
            ? new Date(device.last_seen_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
            : "—"
          }
        </span>

        {/* Status */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          padding: "4px 10px", borderRadius: 999,
          background: device.is_online ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.06)",
          border: device.is_online ? "1px solid rgba(34,197,94,0.28)" : "1px solid rgba(239,68,68,0.22)",
          color: device.is_online ? "var(--ch-green-2)" : "var(--ch-red)",
          fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap",
        }}>
          <StatusDot online={device.is_online} />
          {device.is_online ? "En línea" : "Desconectado"}
        </div>
      </div>
    </Link>
  )
}

function exportCsv(devices: Device[]) {
  const header = "id,name,host_type,os_name,agent_version,is_online,last_seen_at"
  const rows = devices.map(d =>
    [d.id, `"${d.name}"`, d.host_type, d.os_name ?? "", d.agent_version ?? "", d.is_online, d.last_seen_at ?? ""].join(",")
  )
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url; a.download = `inventario-${Date.now()}.csv`; a.click()
  URL.revokeObjectURL(url)
}

export default function InventoryPage() {
  const { data: devices, isLoading, refetch } = useDevices()
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState<"all" | "online" | "offline">("all")

  const filtered = useMemo(() => {
    if (!devices) return []
    return devices.filter((d) => {
      const q = search.toLowerCase()
      const matchSearch = !q || d.name.toLowerCase().includes(q) || d.host_type.toLowerCase().includes(q) || (d.os_name?.toLowerCase().includes(q) ?? false)
      const matchStatus = filterType === "all" || (filterType === "online" && d.is_online) || (filterType === "offline" && !d.is_online)
      return matchSearch && matchStatus
    })
  }, [devices, search, filterType])

  const onlineCount = devices?.filter(d => d.is_online).length ?? 0
  const offlineCount = (devices?.length ?? 0) - onlineCount

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 24px", borderBottom: "1px solid var(--line)",
        background: "rgba(10,14,26,0.4)", flexShrink: 0,
        flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1 }}>Inventario</h1>
          <p style={{ fontSize: 13, color: "var(--ch-text-3)", margin: "6px 0 0" }}>
            {devices ? `${devices.length} dispositivos · ${onlineCount} en línea · ${offlineCount} desconectados` : "Lista completa de dispositivos"}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => refetch()}
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: "rgba(59,130,246,0.10)", border: "1px solid rgba(59,130,246,0.3)",
              color: "var(--ch-blue-2)", cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <svg viewBox="0 0 24 24" style={{ width: 13, height: 13 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12a8 8 0 0114-5.3L20 8M20 4v4h-4M20 12a8 8 0 01-14 5.3L4 16M4 20v-4h4"/>
            </svg>
            Actualizar
          </button>
          {devices && (
            <button
              onClick={() => exportCsv(filtered)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: "rgba(255,255,255,0.04)", border: "1px solid var(--line)",
                color: "var(--ch-text-2)", cursor: "pointer", fontFamily: "inherit",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "var(--line-strong)" }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--ch-text-2)"; e.currentTarget.style.borderColor = "var(--line)" }}
            >
              <svg viewBox="0 0 24 24" style={{ width: 13, height: 13 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Exportar CSV
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "12px 24px", borderBottom: "1px solid var(--line)",
        background: "rgba(10,14,26,0.2)", flexShrink: 0,
        flexWrap: "wrap",
      }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 220, maxWidth: 400 }}>
          <svg viewBox="0 0 24 24" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--ch-text-4)" }} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, tipo o SO…"
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "8px 12px 8px 32px", borderRadius: 8, fontSize: 13,
              background: "rgba(255,255,255,0.03)", border: "1px solid var(--line)",
              color: "#fff", outline: "none", fontFamily: "inherit",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(59,130,246,0.4)" }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--line)" }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--ch-text-4)", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}
            >
              ×
            </button>
          )}
        </div>

        {/* Status filter */}
        <div style={{ display: "flex", gap: 4 }}>
          {([["all", "Todos"], ["online", "En línea"], ["offline", "Desconectados"]] as const).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilterType(v)}
              style={{
                padding: "7px 12px", borderRadius: 8, fontSize: 12, fontFamily: "inherit", cursor: "pointer",
                background: filterType === v ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.03)",
                border: "1px solid " + (filterType === v ? "rgba(59,130,246,0.35)" : "var(--line)"),
                color: filterType === v ? "var(--ch-blue-2)" : "var(--ch-text-3)",
                fontWeight: filterType === v ? 600 : 400,
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="ch-scroll" style={{ flex: 1, overflowY: "auto" }}>
        {isLoading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, color: "var(--ch-text-3)", fontSize: 14 }}>
            <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 11-6.2-8.5"/>
            </svg>
            Cargando inventario…
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 14, color: "var(--ch-text-3)" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(255,255,255,0.04)", border: "1px solid var(--line)", display: "grid", placeItems: "center" }}>
              <svg viewBox="0 0 24 24" style={{ width: 24, height: 24 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z"/>
              </svg>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ch-text-2)", marginBottom: 4 }}>
                {search ? "Sin resultados" : "Sin dispositivos"}
              </div>
              <div style={{ fontSize: 13 }}>
                {search ? "Ningún dispositivo coincide con la búsqueda" : "No hay dispositivos registrados en el sistema"}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div style={{
              display: "grid", gridTemplateColumns: "auto 1fr auto auto auto",
              gap: 16, padding: "10px 20px",
              borderBottom: "1px solid var(--line)",
              background: "rgba(255,255,255,0.015)",
            }}>
              <span style={{ width: 38 }} />
              <span style={{ fontSize: 10, letterSpacing: 1.2, color: "var(--ch-text-4)", fontWeight: 600 }}>DISPOSITIVO</span>
              <span style={{ fontSize: 10, letterSpacing: 1.2, color: "var(--ch-text-4)", fontWeight: 600 }}>AGENTE</span>
              <span style={{ fontSize: 10, letterSpacing: 1.2, color: "var(--ch-text-4)", fontWeight: 600 }}>VISTO</span>
              <span style={{ fontSize: 10, letterSpacing: 1.2, color: "var(--ch-text-4)", fontWeight: 600 }}>ESTADO</span>
            </div>
            {filtered.map(d => <DeviceRow key={d.id} device={d} />)}
            <div style={{ padding: "10px 20px", fontSize: 12, color: "var(--ch-text-4)" }}>
              {filtered.length} de {devices?.length ?? 0} dispositivos
            </div>
          </>
        )}
      </div>
    </div>
  )
}
