"use client"

import { useState } from "react"
import { auditApi } from "@/lib/api/devices"
import type { AuditEvent } from "@/lib/api/devices"
import { useQuery } from "@tanstack/react-query"

const EVENT_META: Record<string, { color: string; bg: string; label: string }> = {
  login:          { color: "var(--ch-green-2)",  bg: "rgba(34,197,94,0.10)",   label: "Login" },
  logout:         { color: "var(--ch-text-3)",   bg: "rgba(255,255,255,0.05)", label: "Logout" },
  login_failed:   { color: "var(--ch-red)",      bg: "rgba(239,68,68,0.10)",   label: "Login fallido" },
  device_created: { color: "var(--ch-blue-2)",   bg: "rgba(59,130,246,0.10)",  label: "Dispositivo creado" },
  device_updated: { color: "var(--ch-blue-2)",   bg: "rgba(59,130,246,0.08)",  label: "Dispositivo actualizado" },
  device_deleted: { color: "var(--ch-red)",      bg: "rgba(239,68,68,0.08)",   label: "Dispositivo eliminado" },
  action_run:     { color: "var(--ch-violet-2)", bg: "rgba(139,92,246,0.10)",  label: "Acción ejecutada" },
}

function evtMeta(type: string) {
  return EVENT_META[type] ?? { color: "var(--ch-text-2)", bg: "rgba(255,255,255,0.04)", label: type }
}

function fmtDate(ts: string) {
  const d = new Date(ts)
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
    + " · "
    + d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

function EventRow({ event }: { event: AuditEvent }) {
  const [open, setOpen] = useState(false)
  const meta = evtMeta(event.event_type)
  return (
    <div
      style={{
        display: "grid", gridTemplateColumns: "auto 1fr auto",
        alignItems: "start", gap: 14,
        padding: "14px 20px",
        borderBottom: "1px solid var(--line)",
        cursor: event.details ? "pointer" : "default",
        transition: "background 120ms",
      }}
      onClick={() => event.details && setOpen(o => !o)}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)" }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent" }}
    >
      {/* Type badge */}
      <span style={{
        display: "inline-flex", alignItems: "center",
        padding: "3px 10px", borderRadius: 999,
        background: meta.bg, color: meta.color,
        fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
        minWidth: 120, justifyContent: "center",
      }}>
        {meta.label}
      </span>

      {/* Details */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {event.target_type && (
            <span style={{ fontSize: 12, color: "var(--ch-text-2)" }}>
              {event.target_type}{event.target_id ? ` #${event.target_id}` : ""}
            </span>
          )}
          {event.source_ip && (
            <span className="mono" style={{ fontSize: 11, color: "var(--ch-text-4)", padding: "2px 7px", borderRadius: 5, background: "rgba(255,255,255,0.04)", border: "1px solid var(--line)" }}>
              {event.source_ip}
            </span>
          )}
        </div>
        {open && event.details && (
          <pre style={{ margin: 0, fontSize: 12, color: "var(--ch-text-3)", whiteSpace: "pre-wrap", wordBreak: "break-all", background: "rgba(0,0,0,0.2)", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", marginTop: 4 }}>
            {event.details}
          </pre>
        )}
      </div>

      {/* Timestamp */}
      <span className="mono" style={{ fontSize: 11, color: "var(--ch-text-4)", whiteSpace: "nowrap" }}>
        {fmtDate(event.created_at)}
      </span>
    </div>
  )
}

export default function AuditPage() {
  const [limit, setLimit] = useState(50)
  const { data: events, isLoading, refetch } = useQuery({
    queryKey: ["audit-events", limit],
    queryFn: () => auditApi.getEvents({ limit }),
  })

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 24px", borderBottom: "1px solid var(--line)",
        background: "rgba(10,14,26,0.4)", flexShrink: 0,
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1 }}>Auditoría</h1>
          <p style={{ fontSize: 13, color: "var(--ch-text-3)", margin: "6px 0 0" }}>Registro de eventos y acciones del sistema</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            style={{
              padding: "7px 10px", borderRadius: 8, fontSize: 12, fontFamily: "inherit",
              background: "rgba(255,255,255,0.04)", border: "1px solid var(--line)",
              color: "var(--ch-text-2)", cursor: "pointer", outline: "none",
            }}
          >
            {[25, 50, 100, 250].map(n => <option key={n} value={n}>{n} eventos</option>)}
          </select>
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
        </div>
      </div>

      {/* Content */}
      <div className="ch-scroll" style={{ flex: 1, overflowY: "auto" }}>
        {isLoading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, color: "var(--ch-text-3)", fontSize: 14 }}>
            <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 11-6.2-8.5"/>
            </svg>
            Cargando auditoría…
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : !events || events.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 14, color: "var(--ch-text-3)" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(255,255,255,0.04)", border: "1px solid var(--line)", display: "grid", placeItems: "center" }}>
              <svg viewBox="0 0 24 24" style={{ width: 24, height: 24 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ch-text-2)", marginBottom: 4 }}>Sin eventos</div>
              <div style={{ fontSize: 13 }}>No hay eventos de auditoría registrados</div>
            </div>
          </div>
        ) : (
          <div style={{ background: "rgba(10,14,26,0.3)" }}>
            {/* Table header */}
            <div style={{
              display: "grid", gridTemplateColumns: "auto 1fr auto",
              gap: 14, padding: "10px 20px",
              borderBottom: "1px solid var(--line)",
              background: "rgba(255,255,255,0.02)",
            }}>
              <span style={{ minWidth: 120, fontSize: 10, letterSpacing: 1.2, color: "var(--ch-text-4)", fontWeight: 600 }}>TIPO</span>
              <span style={{ fontSize: 10, letterSpacing: 1.2, color: "var(--ch-text-4)", fontWeight: 600 }}>DETALLE</span>
              <span style={{ fontSize: 10, letterSpacing: 1.2, color: "var(--ch-text-4)", fontWeight: 600 }}>FECHA</span>
            </div>
            {events.map((ev) => <EventRow key={ev.id} event={ev} />)}
            {events.length >= limit && (
              <div style={{ padding: "12px 20px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "center" }}>
                <button
                  onClick={() => setLimit(l => l + 50)}
                  style={{
                    padding: "7px 20px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: "rgba(255,255,255,0.04)", border: "1px solid var(--line)",
                    color: "var(--ch-text-2)", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Cargar más
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
