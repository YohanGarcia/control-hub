"use client"

import { use, useState, useEffect, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useDevice, useDeviceStatus, useDeviceMetrics, useDeviceActions, useDeviceActionHistory, useRunAction } from "@/hooks/useDevices"
import type { DeviceAction, ActionRun } from "@/lib/api/devices"
import { useWebSocket } from "@/components/providers/websocket-provider"
import { LineChart, Sparkline, MultiSeriesChart } from "@/components/shared/sparkline"

/* ── helpers ── */
function StatusDot({ online }: { online: boolean }) {
  const c = online ? "var(--ch-green)" : "var(--ch-red)"
  return (
    <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}>
      <span className={online ? "pulse" : ""} style={{ position: "absolute", inset: 0, borderRadius: "50%", background: c, boxShadow: `0 0 8px ${c}` }} />
    </span>
  )
}

function Pill({ children, color = "var(--ch-text-2)", bg = "rgba(255,255,255,0.04)", border = "var(--line)" }: {
  children: React.ReactNode; color?: string; bg?: string; border?: string
}) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 9px", borderRadius: 999,
      background: bg, border: `1px solid ${border}`, color,
      fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
    }}>{children}</span>
  )
}

function Panel({ title, action, children, padless }: {
  title?: string; action?: React.ReactNode; children: React.ReactNode; padless?: boolean
}) {
  return (
    <div style={{ background: "rgba(15,20,36,0.6)", border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden" }}>
      {(title || action) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{title}</div>
          {action}
        </div>
      )}
      <div style={{ padding: padless ? 0 : 18 }}>{children}</div>
    </div>
  )
}

function SmallStat({ label, value, icon, color = "var(--ch-text-2)" }: { label: string; value: string | number; icon: React.ReactNode; color?: string }) {
  return (
    <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(15,20,36,0.6)", border: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(255,255,255,0.04)", border: "1px solid var(--line)", color, display: "grid", placeItems: "center" }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, color: "var(--ch-text-3)" }}>{label}</div>
        <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{value}</div>
      </div>
    </div>
  )
}

function MetricCardBig({ icon, title, value, sub, badge, color, data, accentBg, rangeMinutes }: {
  icon: React.ReactNode; title: string; value: number; sub: string; badge: string
  color: string; data: number[]; accentBg: string; rangeMinutes: number
}) {
  const chartTimes = getChartTimes(rangeMinutes)
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", padding: 18,
      background: "rgba(15,20,36,0.6)", border: "1px solid var(--line)", borderRadius: 14,
      position: "relative", overflow: "hidden", boxShadow: `inset 0 0 30px ${accentBg}`,
    }}>
      <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: accentBg, filter: "blur(40px)", pointerEvents: "none" }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid var(--line)", color, display: "grid", placeItems: "center" }}>
            {icon}
          </div>
          <div>
            <div style={{ fontSize: 14, color: "var(--ch-text-2)", fontWeight: 500 }}>{title}</div>
            <div style={{ fontSize: 32, fontWeight: 700, color, letterSpacing: -0.5, marginTop: 2, lineHeight: 1 }}>{value.toFixed(0)}%</div>
          </div>
        </div>
        <span style={{ padding: "5px 10px", borderRadius: 7, background: "rgba(255,255,255,0.04)", border: "1px solid var(--line)", color: "var(--ch-text-2)", fontSize: 11, fontWeight: 600 }}>{badge}</span>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ch-text-3)", marginTop: 8, marginBottom: 10, position: "relative" }}>{sub}</div>
      <div style={{ position: "relative", display: "flex", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", fontSize: 10, color: "var(--ch-text-4)", paddingTop: 4, paddingBottom: 18, width: 28, flexShrink: 0 }}>
          <span>100%</span><span>50%</span><span>0%</span>
        </div>
        <div style={{ flex: 1, position: "relative" }}>
          <LineChart data={data} color={color} height={150} />
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0 0", fontSize: 10, color: "var(--ch-text-4)" }}>
            {chartTimes.map((t) => <span key={t}>{t}</span>)}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 120 }}>
      <span className="mono" style={{ fontSize: 12, color: "#fff", minWidth: 40 }}>{value.toFixed(1)}%</span>
      <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, value)}%`, height: "100%", background: color, boxShadow: `0 0 4px ${color}` }} />
      </div>
    </div>
  )
}

const ICON_CPU = (
  <svg viewBox="0 0 24 24" style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="5" width="14" height="14" rx="2" /><rect x="9" y="9" width="6" height="6" />
    <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
  </svg>
)
const ICON_RAM = (
  <svg viewBox="0 0 24 24" style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="8" width="18" height="9" rx="1" /><path d="M6 17v2M10 17v2M14 17v2M18 17v2M7 11h2M11 11h2M15 11h2" />
  </svg>
)
const ICON_DISK = (
  <svg viewBox="0 0 24 24" style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
  </svg>
)
const ICON_CHECK = (
  <svg viewBox="0 0 24 24" style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12l4 4 10-10" />
  </svg>
)
const ICON_TERMINAL = (
  <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="6" width="16" height="12" /><path d="M7 10l3 2-3 2" /><path d="M13 14h4" />
  </svg>
)
const ICON_REFRESH = (
  <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12a8 8 0 0114-5.3L20 8M20 4v4h-4M20 12a8 8 0 01-14 5.3L4 16M4 20v-4h4" />
  </svg>
)
const ICON_BACK = (
  <svg viewBox="0 0 24 24" style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 6l6 6-6 6" style={{ transform: "rotate(180deg)", transformOrigin: "center" }} />
  </svg>
)
const ICON_SERVER = (
  <svg viewBox="0 0 24 24" style={{ width: 26, height: 26 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="7" rx="1.5" /><rect x="3" y="13" width="18" height="7" rx="1.5" /><path d="M7 7.5h.01M7 16.5h.01" />
  </svg>
)

/* ── buildSparkData: builds spark arrays from real metrics ── */
function buildSparkData(metrics: Array<{ cpu_percent: number; ram_percent: number; disk_percent: number }> | undefined) {
  if (!metrics || metrics.length === 0) {
    return { cpu: [0], ram: [0], disk: [0] }
  }
  return {
    cpu: metrics.map((m) => m.cpu_percent),
    ram: metrics.map((m) => m.ram_percent),
    disk: metrics.map((m) => m.disk_percent),
  }
}

function getChartTimes(rangeMinutes: number): string[] {
  return Array.from({ length: 6 }, (_, i) => {
    if (i === 5) return "Ahora"
    const mins = Math.round((rangeMinutes / 5) * (5 - i))
    return mins >= 60 ? `-${(mins / 60).toFixed(0)}h` : `-${mins}m`
  })
}

/* ── TABS ── */
const TABS = ["Resumen", "Métricas", "Acciones", "Historial", "Procesos", "Servicios", "Registros", "Alertas", "Configuración"]

/* ── InfoStrip icons ── */
const ICON_CUBE = <svg viewBox="0 0 24 24" style={{ width: 15, height: 15 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
const ICON_CLOCK = <svg viewBox="0 0 24 24" style={{ width: 15, height: 15 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
const ICON_USERS = <svg viewBox="0 0 24 24" style={{ width: 15, height: 15 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
const ICON_ACTIVITY = <svg viewBox="0 0 24 24" style={{ width: 15, height: 15 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
const ICON_WIFI = <svg viewBox="0 0 24 24" style={{ width: 15, height: 15 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0114.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><circle cx="12" cy="20" r="1"/></svg>
const ICON_SHIELD = <svg viewBox="0 0 24 24" style={{ width: 15, height: 15 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>

/* ── MiniConsole ── */
interface ConsoleLine { k: "out" | "prompt"; t?: string; cmd?: string; dim?: boolean }

function MiniConsole({ deviceName, hostname }: { deviceName: string; hostname: string }) {
  const [collapsed, setCollapsed] = useState(false)
  const [input, setInput] = useState("")
  const [lines, setLines] = useState<ConsoleLine[]>([
    { k: "out", t: `Bienvenido a ${deviceName}` },
    { k: "out", t: "Escribe un comando y pulsa Ejecutar" },
    { k: "prompt", cmd: "ls -lah" },
    { k: "out", t: "total 48K" },
    { k: "out", t: "drwx------    5 root root 4.0K may 20 10:15 ." },
    { k: "out", t: "drwxr-xr-x   18 root root 4.0K may 18 09:02 .." },
    { k: "out", t: "-rw-------    1 root root 3.2K may 20 10:15 .bash_history" },
    { k: "out", t: "-rw-r--r--    1 root root  220 may 18 09:02 .bashrc" },
  ])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current && !collapsed) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines, collapsed])

  function runCmd() {
    const cmd = input.trim()
    if (!cmd) return
    setLines(p => [...p, { k: "prompt", cmd }, { k: "out", t: `→ '${cmd}' enviado al servidor`, dim: true }])
    setInput("")
  }

  return (
    <div style={{ background: "rgba(15,20,36,0.6)", border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: collapsed ? "none" : "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(255,255,255,0.04)", border: "1px solid var(--line)", color: "var(--ch-blue-2)", display: "grid", placeItems: "center" }}>
            {ICON_TERMINAL}
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Consola</span>
          <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}>
            <span className="pulse" style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--ch-green)", boxShadow: "0 0 8px var(--ch-green)" }} />
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={() => setLines([])}
            title="Limpiar"
            style={{ padding: "6px 9px", borderRadius: 7, background: "rgba(255,255,255,0.02)", border: "1px solid var(--line)", color: "var(--ch-text-2)", cursor: "pointer", display: "grid", placeItems: "center" }}
          >
            <svg viewBox="0 0 24 24" style={{ width: 13, height: 13 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
          </button>
          <button
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? "Expandir" : "Contraer"}
            style={{ padding: "6px 9px", borderRadius: 7, background: "rgba(255,255,255,0.02)", border: "1px solid var(--line)", color: "var(--ch-text-2)", cursor: "pointer", display: "grid", placeItems: "center" }}
          >
            <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, transform: collapsed ? "rotate(-90deg)" : "rotate(90deg)", transition: "transform 200ms" }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6"/>
            </svg>
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Output area */}
          <div ref={scrollRef} className="ch-scroll mono" style={{ maxHeight: 240, overflowY: "auto", padding: "12px 16px", fontSize: 12.5, lineHeight: 1.55 }}>
            {lines.map((l, i) => {
              if (l.k === "prompt") return (
                <div key={i} style={{ display: "flex", alignItems: "baseline" }}>
                  <span style={{ color: "var(--ch-green-2)" }}>{hostname}</span>
                  <span style={{ color: "var(--ch-text-3)" }}>:</span>
                  <span style={{ color: "var(--ch-blue-2)" }}>~</span>
                  <span style={{ color: "var(--ch-text-3)", marginRight: 8 }}>#</span>
                  <span style={{ color: "#fff" }}>{l.cmd}</span>
                </div>
              )
              return (
                <div key={i} style={{ color: l.dim ? "var(--ch-text-3)" : "var(--ch-text-2)" }}>{l.t}</div>
              )
            })}
            <div style={{ display: "flex", alignItems: "baseline" }}>
              <span style={{ color: "var(--ch-green-2)" }}>{hostname}</span>
              <span style={{ color: "var(--ch-text-3)" }}>:</span>
              <span style={{ color: "var(--ch-blue-2)" }}>~</span>
              <span style={{ color: "var(--ch-text-3)", marginRight: 8 }}>#</span>
              <span className="caret" />
            </div>
          </div>

          {/* Input bar */}
          <div style={{ borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") runCmd() }}
              placeholder="Escribe un comando…"
              className="mono"
              spellCheck={false}
              style={{ flex: 1, background: "transparent", border: 0, outline: "none", color: "#fff", fontSize: 13, padding: "6px 8px" }}
            />
            <button
              onClick={runCmd}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 8,
                background: "linear-gradient(180deg, #3b82f6, #2f6ed1)",
                color: "#fff", border: 0, fontWeight: 600, fontSize: 12.5, cursor: "pointer",
                boxShadow: "0 6px 18px rgba(59,130,246,0.35), inset 0 1px 0 rgba(255,255,255,0.18)",
                fontFamily: "inherit",
              }}
            >
              <svg viewBox="0 0 24 24" style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Ejecutar
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/* ── Resumen Tab ── */
function ResumenTab({ device, status, sparkData, rangeMinutes }: {
  device: { name: string; host_type: string; os_name: string | null }
  status: { cpu_percent: number; ram_percent: number; disk_percent: number; uptime_seconds: number } | null
  sparkData: { cpu: number[]; ram: number[]; disk: number[] }
  rangeMinutes: number
}) {
  const cpu = status?.cpu_percent ?? 0
  const ram = status?.ram_percent ?? 0
  const disk = status?.disk_percent ?? 0

  const uptime = status?.uptime_seconds
    ? (() => {
        const d = Math.floor(status.uptime_seconds / 86400)
        const h = Math.floor((status.uptime_seconds % 86400) / 3600)
        const m = Math.floor((status.uptime_seconds % 3600) / 60)
        return `${d}d ${h}h ${m}m`
      })()
    : "—"

  const hostname = device.name.toLowerCase().replace(/\s+/g, "-")

  const infoStrip = [
    {
      icon: ICON_CUBE, title: "Sistema", iconC: "var(--ch-text-2)",
      content: (
        <>
          <div style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{device.os_name ?? device.host_type}</div>
          <div style={{ fontSize: 11, color: "var(--ch-text-3)" }}>64-bit</div>
        </>
      ),
    },
    {
      icon: ICON_CLOCK, title: "Tiempo activo", iconC: "var(--ch-text-2)",
      content: (
        <>
          <div style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{uptime}</div>
        </>
      ),
    },
    {
      icon: ICON_USERS, title: "Usuarios", iconC: "var(--ch-text-2)",
      content: (
        <div style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>3 conectados</div>
      ),
    },
    {
      icon: ICON_ACTIVITY, title: "Carga promedio", iconC: "var(--ch-text-2)",
      content: (
        <>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span className="mono" style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>0.89</span>
            <span className="mono" style={{ fontSize: 13, color: "var(--ch-text-2)" }}>0.74</span>
            <span className="mono" style={{ fontSize: 13, color: "var(--ch-text-2)" }}>0.61</span>
          </div>
          <div style={{ display: "flex", gap: 10, fontSize: 10, color: "var(--ch-text-4)", marginTop: 1 }}>
            <span>1m</span><span>5m</span><span>15m</span>
          </div>
        </>
      ),
    },
    {
      icon: ICON_WIFI, title: "Red", iconC: "var(--ch-text-2)",
      content: (
        <div style={{ fontSize: 12.5, lineHeight: 1.4 }}>
          <div style={{ color: "var(--ch-green-2)" }}>↓ 184 Mbps</div>
          <div style={{ color: "var(--ch-blue-2)" }}>↑ 32 Mbps</div>
        </div>
      ),
    },
    {
      icon: ICON_SHIELD, title: "Estado", iconC: "var(--ch-green-2)",
      content: (
        <div style={{ fontSize: 13, color: status ? "var(--ch-green-2)" : "var(--ch-text-3)", fontWeight: 600 }}>
          {status ? "Sin alertas" : "Sin datos"}
        </div>
      ),
    },
  ]

  return (
    <>
      <div style={{ display: "flex", gap: 16 }}>
        <MetricCardBig icon={ICON_CPU} title="CPU" value={cpu} sub="Uso del procesador" badge={device.os_name?.split(" ")[0] ?? "Linux"} color="var(--ch-blue-2)" accentBg="rgba(59,130,246,0.18)" data={sparkData.cpu} rangeMinutes={rangeMinutes} />
        <MetricCardBig icon={ICON_RAM} title="RAM" value={ram} sub="Uso de memoria" badge="RAM" color="var(--ch-green-2)" accentBg="rgba(34,197,94,0.18)" data={sparkData.ram} rangeMinutes={rangeMinutes} />
        <MetricCardBig icon={ICON_DISK} title="Disco" value={disk} sub="Uso del disco" badge="Disco" color="var(--ch-violet-2)" accentBg="rgba(139,92,246,0.18)" data={sparkData.disk} rangeMinutes={rangeMinutes} />
      </div>

      {/* Info strip — 6 columnas con iconos */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 0,
        background: "rgba(15,20,36,0.5)", border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden",
      }}>
        {infoStrip.map((cell, i) => (
          <div key={i} style={{
            padding: "14px 16px",
            borderRight: i < infoStrip.length - 1 ? "1px solid var(--line)" : "none",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: "rgba(255,255,255,0.03)", border: "1px solid var(--line)",
              color: cell.iconC, display: "grid", placeItems: "center",
            }}>
              {cell.icon}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, color: "var(--ch-text-3)", fontWeight: 500, marginBottom: 2 }}>{cell.title}</div>
              {cell.content}
            </div>
          </div>
        ))}
      </div>

      {/* Mini consola */}
      <MiniConsole deviceName={device.name} hostname={hostname} />
    </>
  )
}

/* ── Métricas Tab ── */
type MetricSample = {
  cpu_percent: number; ram_percent: number; disk_percent: number
  cpu_min: number | null; cpu_max: number | null
  ram_min: number | null; ram_max: number | null
  disk_min: number | null; disk_max: number | null
  sample_count: number; window_seconds: number
  uptime_seconds: number; created_at: string
}

type MetricField = "cpu" | "ram" | "disk"

function statSummary(arr: number[], samples?: MetricSample[], field?: MetricField) {
  if (arr.length === 0) return { min: 0, max: 0, avg: 0, last: 0, trend: 0 }
  const last = arr[arr.length - 1]
  const prev = arr.length > 1 ? arr[arr.length - 2] : last

  /* usa los min/max reales de la BD si están disponibles */
  let min = Math.min(...arr)
  let max = Math.max(...arr)
  if (samples && field) {
    const mins = samples.map(s => s[`${field}_min`] as number | null).filter((v): v is number => v !== null)
    const maxs = samples.map(s => s[`${field}_max`] as number | null).filter((v): v is number => v !== null)
    if (mins.length > 0) min = Math.min(min, ...mins)
    if (maxs.length > 0) max = Math.max(max, ...maxs)
  }

  return {
    min,
    max,
    avg: arr.reduce((s, v) => s + v, 0) / arr.length,
    last,
    trend: last - prev,
  }
}

function LegendDot({ c, children }: { c: string; children: React.ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: c, boxShadow: `0 0 6px ${c}`, flexShrink: 0 }} />
      {children}
    </span>
  )
}

function SmallMetric({ icon, label, value, delta, color, data }: {
  icon: React.ReactNode; label: string; value: string; delta: string; color: string; data: number[]
}) {
  const isUp = delta.startsWith("+")
  const isDown = delta.startsWith("−") || delta.startsWith("-")
  const deltaColor = isUp ? "var(--ch-red)" : isDown ? "var(--ch-green-2)" : "var(--ch-text-3)"
  return (
    <div style={{ padding: 14, borderRadius: 12, background: "rgba(15,20,36,0.6)", border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(255,255,255,0.04)", border: "1px solid var(--line)", color, display: "grid", placeItems: "center" }}>
            {icon}
          </div>
          <span style={{ fontSize: 12, color: "var(--ch-text-3)" }}>{label}</span>
        </div>
        <span style={{ fontSize: 11, color: deltaColor, fontWeight: 600 }}>{delta}</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <span className="mono" style={{ fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: -0.5 }}>{value}</span>
        <Sparkline data={data.length >= 2 ? data : [0, 0]} color={color} width={90} height={28} />
      </div>
    </div>
  )
}

function BigStat({ label, value, unit, color }: { label: string; value: string; unit?: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--ch-text-3)", fontWeight: 500, marginBottom: 2 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span className="mono" style={{ fontSize: 22, fontWeight: 700, color: color ?? "#fff" }}>{value}</span>
        {unit && <span className="mono" style={{ fontSize: 11, color: "var(--ch-text-3)" }}>{unit}</span>}
      </div>
    </div>
  )
}

function DiskRow({ path, used, total, color, last }: { path: string; used: number; total: number; color: string; last?: boolean }) {
  const pct = (used / total) * 100
  return (
    <div style={{ padding: "10px 0", borderBottom: last ? "none" : "1px solid var(--line)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span className="mono" style={{ fontSize: 12.5, color: "#fff" }}>{path}</span>
        <span className="mono" style={{ fontSize: 11.5, color: "var(--ch-text-3)" }}>{used} / {total} GB</span>
      </div>
      <div style={{ height: 6, borderRadius: 4, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, boxShadow: `0 0 6px ${color}`, borderRadius: 4 }} />
      </div>
    </div>
  )
}

function TempRow({ label, v, max, last }: { label: string; v: number; max: number; last?: boolean }) {
  const pct = (v / max) * 100
  const color = pct > 75 ? "var(--ch-red)" : pct > 55 ? "var(--ch-amber)" : "var(--ch-green-2)"
  return (
    <div style={{ padding: "10px 0", borderBottom: last ? "none" : "1px solid var(--line)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, color: "#fff" }}>{label}</span>
        <span className="mono" style={{ fontSize: 12.5, color, fontWeight: 600 }}>{v}°C</span>
      </div>
      <div style={{ height: 6, borderRadius: 4, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, boxShadow: `0 0 6px ${color}`, borderRadius: 4 }} />
      </div>
    </div>
  )
}

function MetricasTab({ sparkData, mergedMetrics, metricsCount, rangeMinutes }: {
  sparkData: { cpu: number[]; ram: number[]; disk: number[] }
  mergedMetrics: MetricSample[]
  metricsCount: number
  rangeMinutes: number
}) {
  const cpuStat = statSummary(sparkData.cpu, mergedMetrics, "cpu")
  const ramStat = statSummary(sparkData.ram, mergedMetrics, "ram")
  const diskStat = statSummary(sparkData.disk, mergedMetrics, "disk")

  /* uptime real de la última muestra */
  const latestSample = mergedMetrics[mergedMetrics.length - 1] ?? null
  const uptimeSeconds = latestSample?.uptime_seconds ?? 0
  const uptimeFmt = uptimeSeconds
    ? (() => {
        const d = Math.floor(uptimeSeconds / 86400)
        const h = Math.floor((uptimeSeconds % 86400) / 3600)
        const m = Math.floor((uptimeSeconds % 3600) / 60)
        return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`
      })()
    : "—"

  /* total de samples en la ventana */
  const totalSamples = mergedMetrics.reduce((s, m) => s + m.sample_count, 0)

  /* mock per-core data, estable con useMemo */
  const cores = useMemo(() => Array.from({ length: 8 }, (_, i) => {
    const base = sparkData.cpu.length > 0
      ? sparkData.cpu[sparkData.cpu.length - 1] * (0.6 + (i % 4) * 0.1)
      : 25 + (i % 4) * 8
    return sparkData.cpu.length >= 2
      ? sparkData.cpu.map((v, j) => Math.max(2, Math.min(98, v * (0.55 + (i % 4) * 0.12) + Math.sin((j + i) * 0.8) * 6)))
      : Array.from({ length: 10 }, () => Math.max(2, Math.min(98, base + Math.random() * 10)))
  }), [sparkData.cpu])

  /* mock net data derivado del cpu para coherencia visual */
  const netIn = useMemo(() => sparkData.cpu.map(v => v * 2.1 + 8), [sparkData.cpu])
  const netOut = useMemo(() => sparkData.cpu.map(v => v * 0.4 + 3), [sparkData.cpu])

  const cpuDelta = cpuStat.trend >= 0.5 ? `+${cpuStat.trend.toFixed(1)}%` : cpuStat.trend <= -0.5 ? `${cpuStat.trend.toFixed(1)}%` : "estable"
  const ramGb = (ramStat.last / 100 * 8).toFixed(1)
  const ramDelta = ramStat.trend >= 0.5 ? `+${(ramStat.trend / 100 * 8).toFixed(2)} GB` : ramStat.trend <= -0.5 ? `${(ramStat.trend / 100 * 8).toFixed(2)} GB` : "estable"

  return (
    <>
      {/* Fila 1 — 4 tarjetas SmallMetric */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <SmallMetric icon={ICON_CPU} label="CPU promedio" value={`${cpuStat.avg.toFixed(0)}%`} delta={cpuDelta} color="var(--ch-blue-2)" data={sparkData.cpu} />
        <SmallMetric
          icon={ICON_RAM} label="Memoria" value={`${ramGb} GB`} delta={ramDelta}
          color="var(--ch-green-2)" data={sparkData.ram}
        />
        <SmallMetric
          icon={<svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0114.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><circle cx="12" cy="20" r="1"/></svg>}
          label="Red total" value={`${(netIn[netIn.length - 1] ?? 0).toFixed(0)} Mbps`} delta="+12%"
          color="var(--ch-violet-2)" data={netIn}
        />
        <SmallMetric
          icon={ICON_CLOCK}
          label="Tiempo activo" value={uptimeFmt} delta={`${totalSamples} muestras`}
          color="var(--ch-cyan, #06b6d4)" data={sparkData.cpu.length >= 2 ? sparkData.cpu : [0, 0]}
        />
      </div>

      {/* Fila 2 — Gráfico multi-serie (CPU + RAM + Disco) */}
      <Panel
        title="Uso del sistema · histórico"
        action={
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 12, color: "var(--ch-text-3)" }}>
            <LegendDot c="var(--ch-blue-2)">CPU</LegendDot>
            <LegendDot c="var(--ch-green-2)">RAM</LegendDot>
            <LegendDot c="var(--ch-violet-2)">Disco</LegendDot>
            <Pill>{metricsCount} pts · {totalSamples} muestras</Pill>
          </div>
        }
      >
        <MultiSeriesChart
          series={[
            { color: "var(--ch-blue-2)", data: sparkData.cpu },
            { color: "var(--ch-green-2)", data: sparkData.ram },
            { color: "var(--ch-violet-2)", data: sparkData.disk },
          ]}
          height={220}
        />
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 6, fontSize: 10, color: "var(--ch-text-4)" }}>
          {getChartTimes(rangeMinutes).map((t) => <span key={t}>{t}</span>)}
        </div>
      </Panel>

      {/* Fila 3 — CPU por núcleo + Red */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        {/* CPU por núcleo */}
        <Panel title={`CPU por núcleo (${cores.length})`} action={<Pill>{cpuStat.min.toFixed(0)} — {cpuStat.max.toFixed(0)}%</Pill>}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {cores.map((c, i) => {
              const last = c[c.length - 1] ?? 0
              return (
                <div key={i} style={{ padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.025)", border: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span className="mono" style={{ fontSize: 11, color: "var(--ch-text-3)" }}>core {i}</span>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: last > 80 ? "var(--ch-red)" : "#fff" }}>{Math.round(last)}%</span>
                  </div>
                  <Sparkline data={c.length >= 2 ? c : [0, 0]} color="var(--ch-blue-2)" width={120} height={24} />
                </div>
              )
            })}
          </div>
        </Panel>

        {/* Red */}
        <Panel title="Red · entrada / salida" action={<Pill color="var(--ch-green-2)" bg="rgba(34,197,94,0.10)" border="rgba(34,197,94,0.3)">{(netIn[netIn.length - 1] ?? 0).toFixed(0)} Mbps</Pill>}>
          <div style={{ display: "flex", gap: 18, marginBottom: 12 }}>
            <BigStat label="Entrada" value={(netIn[netIn.length - 1] ?? 0).toFixed(0)} unit="Mbps" color="var(--ch-green-2)" />
            <BigStat label="Salida" value={(netOut[netOut.length - 1] ?? 0).toFixed(0)} unit="Mbps" color="var(--ch-blue-2)" />
            <BigStat label="Paquetes/s" value="14.2K" color="var(--ch-violet-2)" />
          </div>
          <MultiSeriesChart
            series={[
              { color: "var(--ch-green-2)", data: netIn },
              { color: "var(--ch-blue-2)", data: netOut },
            ]}
            height={130}
          />
        </Panel>
      </div>

      {/* Fila 4 — Disco por mount + Carga promedio + Temperatura */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        <Panel title="Disco · uso por punto de montaje">
          <DiskRow path="/" used={201} total={480} color="var(--ch-violet-2)" />
          <DiskRow path="/var" used={64} total={120} color="var(--ch-blue-2)" />
          <DiskRow path="/home" used={12} total={80} color="var(--ch-green-2)" />
          <DiskRow path="/tmp" used={0.8} total={8} color="var(--ch-amber)" last />
        </Panel>

        <Panel title="Carga promedio">
          <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginBottom: 16 }}>
            <BigStat label="1 min" value="0.89" color="var(--ch-green-2)" />
            <BigStat label="5 min" value="0.74" color="var(--ch-blue-2)" />
            <BigStat label="15 min" value="0.61" color="var(--ch-violet-2)" />
          </div>
          <div style={{ fontSize: 11, color: "var(--ch-text-3)", marginBottom: 6 }}>Tendencia (15 min)</div>
          <Sparkline
            data={sparkData.cpu.length >= 2 ? sparkData.cpu.map(v => v / 100 * 1.4) : [0.6, 0.7]}
            color="var(--ch-green-2)" width={300} height={56}
          />
        </Panel>

        <Panel title="Temperatura · sensores">
          <TempRow label="CPU package" v={62} max={95} />
          <TempRow label="GPU" v={48} max={90} />
          <TempRow label="NVMe" v={41} max={75} />
          <TempRow label="Chassis" v={28} max={60} last />
        </Panel>
      </div>
    </>
  )
}

/* ── Procesos Tab (mock) ── */
const MOCK_PROCESSES = [
  { pid: 1432, user: "root", cpu: 2.1, mem: 0.8, state: "running", cmd: "nginx: master process /usr/sbin/nginx" },
  { pid: 2104, user: "postgres", cpu: 5.4, mem: 3.1, state: "running", cmd: "postgres -D /var/lib/postgresql" },
  { pid: 4421, user: "app", cpu: 8.2, mem: 4.6, state: "running", cmd: "node /srv/api/dist/index.js" },
  { pid: 5012, user: "redis", cpu: 0.3, mem: 0.4, state: "running", cmd: "redis-server *:6379" },
  { pid: 6201, user: "root", cpu: 0.1, mem: 0.2, state: "sleeping", cmd: "/usr/sbin/cron -f" },
  { pid: 7411, user: "docker", cpu: 3.2, mem: 1.8, state: "running", cmd: "dockerd --containerd /run/containerd/containerd.sock" },
]

function ProcesosTab() {
  const stateStyles: Record<string, { c: string; bg: string; b: string; l: string }> = {
    running: { c: "var(--ch-green-2)", bg: "rgba(34,197,94,0.10)", b: "rgba(34,197,94,0.3)", l: "activo" },
    sleeping: { c: "var(--ch-blue-2)", bg: "rgba(59,130,246,0.10)", b: "rgba(59,130,246,0.3)", l: "en espera" },
    zombie: { c: "var(--ch-red)", bg: "rgba(239,68,68,0.10)", b: "rgba(239,68,68,0.3)", l: "zombie" },
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <SmallStat label="Procesos totales" value={MOCK_PROCESSES.length} icon={ICON_CHECK} />
        <SmallStat label="En ejecución" value={MOCK_PROCESSES.filter(p => p.state === "running").length} icon={ICON_CHECK} color="var(--ch-green-2)" />
        <SmallStat label="En espera" value={MOCK_PROCESSES.filter(p => p.state === "sleeping").length} icon={ICON_CHECK} color="var(--ch-blue-2)" />
        <SmallStat label="Zombies" value={0} icon={ICON_CHECK} color="var(--ch-red)" />
      </div>
      <Panel padless title={`${MOCK_PROCESSES.length} procesos`}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ color: "var(--ch-text-3)", fontSize: 11, letterSpacing: 0.8 }}>
                {["PID", "Usuario", "%CPU", "%MEM", "Estado", "Comando"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 14px", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_PROCESSES.map((p) => {
                const ss = stateStyles[p.state] ?? stateStyles.running
                return (
                  <tr key={p.pid} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={{ padding: "10px 14px" }}><span className="mono" style={{ color: "var(--ch-text-2)" }}>{p.pid}</span></td>
                    <td style={{ padding: "10px 14px" }}><span style={{ color: "#fff" }}>{p.user}</span></td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="mono" style={{ color: "#fff" }}>{p.cpu.toFixed(1)}</span>
                        <div style={{ width: 60, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.04)" }}>
                          <div style={{ width: `${Math.min(100, (p.cpu / 20) * 100)}%`, height: "100%", background: "var(--ch-blue-2)" }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="mono" style={{ color: "#fff" }}>{p.mem.toFixed(1)}</span>
                        <div style={{ width: 60, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.04)" }}>
                          <div style={{ width: `${Math.min(100, (p.mem / 10) * 100)}%`, height: "100%", background: "var(--ch-green-2)" }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <Pill color={ss.c} bg={ss.bg} border={ss.b}>{ss.l}</Pill>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span className="mono" style={{ color: "var(--ch-text-2)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden", maxWidth: 320, display: "block" }}>{p.cmd}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  )
}

/* ── Servicios Tab (mock) ── */
const MOCK_SERVICES = [
  { name: "nginx", desc: "High-performance web server", state: "active", since: "1h 32m", mem: "21.4M" },
  { name: "postgresql", desc: "PostgreSQL relational database", state: "active", since: "4h 12m", mem: "342M" },
  { name: "redis-server", desc: "In-memory data structure store", state: "active", since: "2h 04m", mem: "48M" },
  { name: "docker", desc: "Container runtime", state: "active", since: "8h", mem: "186M" },
  { name: "fail2ban", desc: "Brute-force protection", state: "active", since: "15d", mem: "12M" },
  { name: "snapd", desc: "Snap package daemon", state: "failed", since: "—", mem: "0" },
]

function ServiciosTab() {
  const stateMeta: Record<string, { c: string; bg: string; b: string; l: string; icon: React.ReactNode }> = {
    active: { c: "var(--ch-green-2)", bg: "rgba(34,197,94,0.10)", b: "rgba(34,197,94,0.3)", l: "Activo", icon: ICON_CHECK },
    inactive: { c: "var(--ch-text-3)", bg: "rgba(255,255,255,0.04)", b: "var(--line)", l: "Inactivo", icon: ICON_CHECK },
    failed: { c: "var(--ch-red)", bg: "rgba(239,68,68,0.10)", b: "rgba(239,68,68,0.3)", l: "Fallo", icon: ICON_CHECK },
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <SmallStat label="Total servicios" value={MOCK_SERVICES.length} icon={ICON_CHECK} />
        <SmallStat label="Activos" value={MOCK_SERVICES.filter(s => s.state === "active").length} icon={ICON_CHECK} color="var(--ch-green-2)" />
        <SmallStat label="Inactivos" value={0} icon={ICON_CHECK} color="var(--ch-text-3)" />
        <SmallStat label="Con fallos" value={MOCK_SERVICES.filter(s => s.state === "failed").length} icon={ICON_CHECK} color="var(--ch-red)" />
      </div>
      <Panel padless title={`${MOCK_SERVICES.length} servicios`}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {MOCK_SERVICES.map((s, i) => {
            const m = stateMeta[s.state] ?? stateMeta.inactive
            return (
              <div key={s.name} style={{
                display: "grid", gridTemplateColumns: "32px 1.4fr 0.8fr 0.6fr auto",
                gap: 14, alignItems: "center", padding: "14px 18px",
                borderTop: i === 0 ? "none" : "1px solid var(--line)",
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${m.b}`, background: m.bg, color: m.c, display: "grid", placeItems: "center" }}>
                  {m.icon}
                </div>
                <div>
                  <div className="mono" style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{s.name}.service</div>
                  <div style={{ fontSize: 11.5, color: "var(--ch-text-3)" }}>{s.desc}</div>
                </div>
                <Pill color={m.c} bg={m.bg} border={m.b}>{m.l}</Pill>
                <span className="mono" style={{ fontSize: 12, color: "var(--ch-text-2)" }}>{s.since} · {s.mem}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button title="Reiniciar" style={{ width: 26, height: 26, borderRadius: 6, background: "transparent", border: "1px solid transparent", color: "var(--ch-text-3)", cursor: "pointer", display: "grid", placeItems: "center" }}>
                    {ICON_REFRESH}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </Panel>
    </>
  )
}

/* ── Registros Tab ── */
const STREAM_TEMPLATES = [
  { sev: "info", src: "nginx", t: '127.0.0.1 - "GET /v1/health" 200 18ms' },
  { sev: "ok", src: "queue", t: "job.completed kind=billing.invoice attempts=1 latency=183ms" },
  { sev: "warn", src: "api", t: "rate-limit triggered route=/v1/search count=140" },
  { sev: "info", src: "redis", t: "CACHE hit ratio=98.4% keys=1.2M evicted=0" },
  { sev: "ok", src: "cert", t: "TLS renewed domain=control.center expires_in=89d" },
  { sev: "warn", src: "sys", t: "memory.pressure rss=68% swap_used=124MB threshold=70%" },
]

const SEV_STYLE: Record<string, { c: string; label: string }> = {
  info: { c: "var(--ch-blue-2)", label: "INFO" },
  ok: { c: "var(--ch-green-2)", label: "OK  " },
  warn: { c: "var(--ch-amber)", label: "WARN" },
  err: { c: "var(--ch-red)", label: "ERR " },
}

interface LogEntry { sev: string; src: string; t: string; time: string; _id: number }

function RegistrosTab() {
  const [paused, setPaused] = useState(false)
  const [lines, setLines] = useState<LogEntry[]>(() =>
    Array.from({ length: 10 }, (_, i) => {
      const tpl = STREAM_TEMPLATES[i % STREAM_TEMPLATES.length]
      return { ...tpl, time: "00:00:00", _id: i }
    })
  )
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (paused) return
    const id = setInterval(() => {
      const tpl = STREAM_TEMPLATES[Math.floor(Math.random() * STREAM_TEMPLATES.length)]
      const now = new Date()
      const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`
      setLines(prev => {
        const next = [...prev, { ...tpl, time, _id: Date.now() }]
        if (next.length > 200) next.splice(0, next.length - 200)
        return next
      })
    }, 900)
    return () => clearInterval(id)
  }, [paused])

  useEffect(() => {
    if (scrollRef.current && !paused) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines, paused])

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <SmallStat label="Eventos total" value={lines.length} icon={ICON_CHECK} color="var(--ch-blue-2)" />
        <SmallStat label="Info" value={lines.filter(l => l.sev === "info").length} icon={ICON_CHECK} color="var(--ch-blue-2)" />
        <SmallStat label="Advertencias" value={lines.filter(l => l.sev === "warn").length} icon={ICON_CHECK} color="var(--ch-amber)" />
        <SmallStat label="Errores" value={lines.filter(l => l.sev === "err").length} icon={ICON_CHECK} color="var(--ch-red)" />
      </div>
      <Panel padless title={`Registro del sistema · ${lines.length} líneas`} action={
        <button onClick={() => setPaused(p => !p)} style={{
          display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8,
          background: paused ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.025)",
          border: "1px solid var(--line)", color: paused ? "var(--ch-violet-2)" : "var(--ch-text-2)",
          fontSize: 12, cursor: "pointer", fontFamily: "inherit",
        }}>
          {paused ? "▶ Reanudar" : "⏸ Pausar"}
        </button>
      }>
        <div ref={scrollRef} className="ch-scroll" style={{ height: 460, overflowY: "auto", padding: "12px 18px", fontSize: 12.5 }}>
          {lines.map((l, i) => {
            const s = SEV_STYLE[l.sev] ?? SEV_STYLE.info
            return (
              <div key={l._id} className="mono line-in" style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "2px 0" }}>
                <span style={{ color: "var(--ch-text-4)", minWidth: 64 }}>{l.time}</span>
                <span style={{ color: s.c, fontWeight: 700, minWidth: 38 }}>{s.label}</span>
                <span style={{ color: "var(--ch-violet-2)", minWidth: 56 }}>{l.src}</span>
                <span style={{ color: "var(--ch-text)" }}>{l.t}</span>
              </div>
            )
          })}
        </div>
      </Panel>
    </>
  )
}

/* ── Alertas Tab (mock) ── */
const MOCK_ALERTS = [
  { id: "a1", sev: "warn", title: "Memoria por encima del 65%", src: "monitor", time: "hace 2 min", desc: "RSS rondando 68% durante 5 min.", acked: false },
  { id: "a2", sev: "info", title: "Agente conectado", src: "agent", time: "hace 14 min", desc: "El agente reportó estado OK.", acked: false },
  { id: "a3", sev: "ok", title: "Backup completado", src: "backup", time: "hace 1 h", desc: "Backup exitoso sin errores.", acked: true },
]

function AlertasTab() {
  const [tab, setTab] = useState("Activas")
  const list = MOCK_ALERTS.filter(a => tab === "Activas" ? !a.acked : a.acked)
  const meta: Record<string, { c: string; bg: string; b: string; l: string }> = {
    warn: { c: "var(--ch-amber)", bg: "rgba(245,158,11,0.10)", b: "rgba(245,158,11,0.3)", l: "Advertencia" },
    err: { c: "var(--ch-red)", bg: "rgba(239,68,68,0.10)", b: "rgba(239,68,68,0.3)", l: "Crítico" },
    info: { c: "var(--ch-blue-2)", bg: "rgba(59,130,246,0.10)", b: "rgba(59,130,246,0.3)", l: "Info" },
    ok: { c: "var(--ch-green-2)", bg: "rgba(34,197,94,0.10)", b: "rgba(34,197,94,0.3)", l: "Resuelto" },
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <SmallStat label="Activas" value={MOCK_ALERTS.filter(a => !a.acked).length} icon={ICON_CHECK} color="var(--ch-amber)" />
        <SmallStat label="Críticas" value={MOCK_ALERTS.filter(a => a.sev === "err" && !a.acked).length} icon={ICON_CHECK} color="var(--ch-red)" />
        <SmallStat label="Reconocidas" value={MOCK_ALERTS.filter(a => a.acked).length} icon={ICON_CHECK} color="var(--ch-green-2)" />
        <SmallStat label="Reglas" value={24} icon={ICON_CHECK} />
      </div>
      <Panel padless title={`${list.length} ${tab.toLowerCase()}`} action={
        <div style={{ display: "inline-flex", padding: 3, background: "rgba(255,255,255,0.025)", border: "1px solid var(--line)", borderRadius: 8 }}>
          {["Activas", "Reconocidas"].map(o => (
            <button key={o} onClick={() => setTab(o)} style={{
              padding: "5px 10px", borderRadius: 6,
              background: tab === o ? "rgba(59,130,246,0.16)" : "transparent",
              border: tab === o ? "1px solid rgba(59,130,246,0.4)" : "1px solid transparent",
              color: tab === o ? "#fff" : "var(--ch-text-3)",
              fontSize: 11.5, cursor: "pointer", fontFamily: "inherit",
            }}>{o}</button>
          ))}
        </div>
      }>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {list.map((a, i) => {
            const m = meta[a.sev] ?? meta.info
            return (
              <div key={a.id} style={{ display: "grid", gridTemplateColumns: "40px 1fr auto", gap: 14, alignItems: "center", padding: "14px 18px", borderTop: i === 0 ? "none" : "1px solid var(--line)" }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, border: `1px solid ${m.b}`, background: m.bg, color: m.c, display: "grid", placeItems: "center" }}>
                  {ICON_CHECK}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: "#fff" }}>{a.title}</span>
                    <Pill color={m.c} bg={m.bg} border={m.b}>{m.l}</Pill>
                    <span style={{ fontSize: 11, color: "var(--ch-text-4)" }}>· {a.time}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--ch-text-3)" }}>{a.desc}</div>
                </div>
                {!a.acked && (
                  <button style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid var(--line)", background: "rgba(255,255,255,0.025)", color: "var(--ch-text)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                    Reconocer
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </Panel>
    </>
  )
}

/* ── Configuración Tab ── */
function ConfiguracionTab({ device }: { device: { name: string; host_type: string; os_name: string | null } }) {
  const [hostname, setHostname] = useState(device.name.toLowerCase())
  const [autoRestart, setAutoRestart] = useState(true)
  const [notifications, setNotifications] = useState("Sólo críticas")
  const [interval, setIntervalVal] = useState("15s")

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Panel title="General">
          {[
            { label: "Nombre del dispositivo", hint: "Identificador único", children: <input value={hostname} onChange={e => setHostname(e.target.value)} style={{ padding: "7px 10px", minWidth: 220, background: "rgba(255,255,255,0.025)", border: "1px solid var(--line)", borderRadius: 8, color: "#fff", fontFamily: "inherit", fontSize: 12.5, outline: "none" }} /> },
            {
              label: "Reinicio automático", hint: "Reinicia si el dispositivo no responde",
              children: (
                <button onClick={() => setAutoRestart(v => !v)} style={{
                  width: 42, height: 24, borderRadius: 999, position: "relative", cursor: "pointer",
                  background: autoRestart ? "linear-gradient(180deg, #3b82f6, #2f6ed1)" : "rgba(255,255,255,0.06)",
                  border: "1px solid " + (autoRestart ? "rgba(59,130,246,0.5)" : "var(--line)"),
                  transition: "all 180ms ease", padding: 0,
                }}>
                  <span style={{ position: "absolute", top: 2, left: autoRestart ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 180ms cubic-bezier(.4,.2,.2,1)", boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }} />
                </button>
              )
            },
          ].map((f, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
              <div>
                <div style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>{f.label}</div>
                {f.hint && <div style={{ fontSize: 11.5, color: "var(--ch-text-3)", marginTop: 2 }}>{f.hint}</div>}
              </div>
              <div>{f.children}</div>
            </div>
          ))}
        </Panel>

        <Panel title="Monitoreo">
          {[
            {
              label: "Intervalo de polling", hint: "Cada cuánto se consultan métricas",
              children: (
                <select value={interval} onChange={e => setIntervalVal(e.target.value)} style={{ padding: "7px 10px", minWidth: 160, background: "rgba(255,255,255,0.025)", border: "1px solid var(--line)", borderRadius: 8, color: "#fff", fontFamily: "inherit", fontSize: 12.5, outline: "none" }}>
                  {["5s", "15s", "30s", "1m", "5m"].map(o => <option key={o} value={o} style={{ background: "#0f1424" }}>{o}</option>)}
                </select>
              )
            },
            {
              label: "Notificaciones", hint: "Qué eventos se envían",
              children: (
                <select value={notifications} onChange={e => setNotifications(e.target.value)} style={{ padding: "7px 10px", minWidth: 160, background: "rgba(255,255,255,0.025)", border: "1px solid var(--line)", borderRadius: 8, color: "#fff", fontFamily: "inherit", fontSize: 12.5, outline: "none" }}>
                  {["Todas", "Sólo críticas", "Ninguna"].map(o => <option key={o} value={o} style={{ background: "#0f1424" }}>{o}</option>)}
                </select>
              )
            },
          ].map((f, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
              <div>
                <div style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>{f.label}</div>
                {f.hint && <div style={{ fontSize: 11.5, color: "var(--ch-text-3)", marginTop: 2 }}>{f.hint}</div>}
              </div>
              <div>{f.children}</div>
            </div>
          ))}
        </Panel>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button style={{ padding: "9px 16px", borderRadius: 10, background: "rgba(255,255,255,0.025)", border: "1px solid var(--line)", color: "var(--ch-text)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
        <button style={{ padding: "9px 16px", borderRadius: 10, background: "linear-gradient(180deg, #3b82f6, #2f6ed1)", border: 0, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 6px 18px rgba(59,130,246,0.32), inset 0 1px 0 rgba(255,255,255,0.18)", fontFamily: "inherit" }}>Guardar cambios</button>
      </div>
    </>
  )
}

/* ── Acciones Tab ── */
const STATUS_META: Record<ActionRun["status"], { c: string; bg: string; b: string; l: string }> = {
  queued:    { c: "var(--ch-text-2)", bg: "rgba(255,255,255,0.04)", b: "var(--line)",             l: "En cola"    },
  running:   { c: "var(--ch-blue-2)", bg: "rgba(59,130,246,0.10)",  b: "rgba(59,130,246,0.3)",    l: "Ejecutando" },
  succeeded: { c: "var(--ch-green-2)",bg: "rgba(34,197,94,0.10)",   b: "rgba(34,197,94,0.3)",     l: "Completado" },
  failed:    { c: "var(--ch-red)",    bg: "rgba(239,68,68,0.10)",   b: "rgba(239,68,68,0.3)",     l: "Fallido"    },
  timeout:   { c: "var(--ch-amber)",  bg: "rgba(245,158,11,0.10)",  b: "rgba(245,158,11,0.3)",    l: "Timeout"    },
}

function AccionesTab({ deviceId }: { deviceId: number }) {
  const { data: actions, isLoading } = useDeviceActions(deviceId)
  const runAction = useRunAction()
  const [runOutput, setRunOutput] = useState<ActionRun | null>(null)
  const [runningId, setRunningId] = useState<number | null>(null)

  async function handleRun(action: DeviceAction) {
    setRunningId(action.id)
    setRunOutput(null)
    try {
      const result = await runAction.mutateAsync({ deviceId, actionId: action.id })
      setRunOutput(result)
    } finally {
      setRunningId(null)
    }
  }

  if (isLoading) {
    return <div style={{ padding: "40px", textAlign: "center", color: "var(--ch-text-3)", fontSize: 13 }}>Cargando acciones…</div>
  }

  if (!actions?.length) {
    return (
      <Panel title="Acciones del dispositivo">
        <div style={{ padding: "24px 0", textAlign: "center", color: "var(--ch-text-3)", fontSize: 13 }}>
          No hay acciones disponibles para este dispositivo.
        </div>
      </Panel>
    )
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        <SmallStat label="Acciones disponibles" value={actions.length} icon={ICON_CHECK} color="var(--ch-blue-2)" />
        <SmallStat label="Activas" value={actions.filter(a => a.is_active).length} icon={ICON_CHECK} color="var(--ch-green-2)" />
        <SmallStat label="Inactivas" value={actions.filter(a => !a.is_active).length} icon={ICON_CHECK} color="var(--ch-text-3)" />
      </div>

      {runOutput && (
        <Panel title="Resultado de la ejecución" action={
          <button onClick={() => setRunOutput(null)} style={{ padding: "5px 10px", borderRadius: 7, background: "transparent", border: "1px solid var(--line)", color: "var(--ch-text-3)", fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}>
            Cerrar
          </button>
        }>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <Pill color={STATUS_META[runOutput.status].c} bg={STATUS_META[runOutput.status].bg} border={STATUS_META[runOutput.status].b}>
                {STATUS_META[runOutput.status].l}
              </Pill>
              {runOutput.exit_code !== null && (
                <span className="mono" style={{ fontSize: 12, color: "var(--ch-text-3)" }}>exit {runOutput.exit_code}</span>
              )}
              {runOutput.started_at && (
                <span style={{ fontSize: 11, color: "var(--ch-text-4)" }}>{new Date(runOutput.started_at).toLocaleTimeString()}</span>
              )}
            </div>
            {runOutput.output_text && (
              <div className="mono ch-scroll" style={{ padding: "12px 14px", background: "rgba(0,0,0,0.3)", borderRadius: 8, border: "1px solid var(--line)", fontSize: 12, color: "var(--ch-text-2)", whiteSpace: "pre-wrap", maxHeight: 300, overflowY: "auto" }}>
                {runOutput.output_text}
              </div>
            )}
            {runOutput.error_text && (
              <div className="mono ch-scroll" style={{ padding: "12px 14px", background: "rgba(239,68,68,0.05)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)", fontSize: 12, color: "var(--ch-red)", whiteSpace: "pre-wrap", maxHeight: 200, overflowY: "auto" }}>
                {runOutput.error_text}
              </div>
            )}
          </div>
        </Panel>
      )}

      <Panel padless title={`${actions.length} acciones disponibles`}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {actions.map((action, i) => (
            <div key={action.id} style={{
              display: "grid", gridTemplateColumns: "1fr auto",
              gap: 14, alignItems: "center", padding: "16px 18px",
              borderTop: i === 0 ? "none" : "1px solid var(--line)",
              opacity: action.is_active ? 1 : 0.5,
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span className="mono" style={{ fontSize: 13.5, fontWeight: 600, color: "#fff" }}>{action.name}</span>
                  {!action.is_active && (
                    <Pill color="var(--ch-text-3)" bg="rgba(255,255,255,0.04)" border="var(--line)">Inactiva</Pill>
                  )}
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 11.5, color: "var(--ch-text-3)" }}>
                  <span className="mono">{action.slug}</span>
                  <span>·</span>
                  <span>Timeout {action.timeout_seconds}s</span>
                  <span>·</span>
                  <span>{action.host_type}</span>
                </div>
              </div>
              <button
                onClick={() => handleRun(action)}
                disabled={!action.is_active || runningId === action.id}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "8px 14px", borderRadius: 10,
                  background: runningId === action.id ? "rgba(59,130,246,0.08)" : "rgba(255,255,255,0.025)",
                  border: "1px solid " + (runningId === action.id ? "rgba(59,130,246,0.4)" : "var(--line)"),
                  color: runningId === action.id ? "var(--ch-blue-2)" : "var(--ch-text)",
                  fontSize: 12.5, fontWeight: 500, cursor: action.is_active ? "pointer" : "not-allowed",
                  fontFamily: "inherit", transition: "all 150ms",
                }}
              >
                {runningId === action.id ? "Ejecutando…" : "▶ Ejecutar"}
              </button>
            </div>
          ))}
        </div>
      </Panel>
    </>
  )
}

/* ── Historial Tab ── */
function HistorialTab({ deviceId }: { deviceId: number }) {
  const { data: history, isLoading } = useDeviceActionHistory(deviceId)
  const [selected, setSelected] = useState<ActionRun | null>(null)

  if (isLoading) {
    return <div style={{ padding: "40px", textAlign: "center", color: "var(--ch-text-3)", fontSize: 13 }}>Cargando historial…</div>
  }

  if (!history?.length) {
    return (
      <Panel title="Historial de ejecuciones">
        <div style={{ padding: "24px 0", textAlign: "center", color: "var(--ch-text-3)", fontSize: 13 }}>
          No hay ejecuciones registradas.
        </div>
      </Panel>
    )
  }

  const succeeded = history.filter(r => r.status === "succeeded").length
  const failed = history.filter(r => r.status === "failed" || r.status === "timeout").length

  function fmtDate(s: string | null) {
    if (!s) return "—"
    return new Date(s).toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <SmallStat label="Total ejecuciones" value={history.length} icon={ICON_CHECK} />
        <SmallStat label="Completadas" value={succeeded} icon={ICON_CHECK} color="var(--ch-green-2)" />
        <SmallStat label="Fallidas" value={failed} icon={ICON_CHECK} color="var(--ch-red)" />
        <SmallStat label="En cola" value={history.filter(r => r.status === "queued" || r.status === "running").length} icon={ICON_CHECK} color="var(--ch-blue-2)" />
      </div>

      {selected && (
        <Panel title={`Ejecución #${selected.id}`} action={
          <button onClick={() => setSelected(null)} style={{ padding: "5px 10px", borderRadius: 7, background: "transparent", border: "1px solid var(--line)", color: "var(--ch-text-3)", fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}>
            Cerrar
          </button>
        }>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <Pill color={STATUS_META[selected.status].c} bg={STATUS_META[selected.status].bg} border={STATUS_META[selected.status].b}>
                {STATUS_META[selected.status].l}
              </Pill>
              {selected.exit_code !== null && (
                <span className="mono" style={{ fontSize: 12, color: "var(--ch-text-3)" }}>exit {selected.exit_code}</span>
              )}
              <span style={{ fontSize: 11, color: "var(--ch-text-4)" }}>{fmtDate(selected.started_at)}</span>
            </div>
            {selected.output_text && (
              <div className="mono ch-scroll" style={{ padding: "12px 14px", background: "rgba(0,0,0,0.3)", borderRadius: 8, border: "1px solid var(--line)", fontSize: 12, color: "var(--ch-text-2)", whiteSpace: "pre-wrap", maxHeight: 300, overflowY: "auto" }}>
                {selected.output_text}
              </div>
            )}
            {selected.error_text && (
              <div className="mono ch-scroll" style={{ padding: "12px 14px", background: "rgba(239,68,68,0.05)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)", fontSize: 12, color: "var(--ch-red)", whiteSpace: "pre-wrap", maxHeight: 200, overflowY: "auto" }}>
                {selected.error_text}
              </div>
            )}
          </div>
        </Panel>
      )}

      <Panel padless title={`${history.length} ejecuciones`}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ color: "var(--ch-text-3)", fontSize: 11, letterSpacing: 0.8 }}>
                {["ID", "Acción", "Estado", "Exit", "Inicio", "Fin", ""].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 14px", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((run) => {
                const m = STATUS_META[run.status]
                return (
                  <tr key={run.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={{ padding: "10px 14px" }}><span className="mono" style={{ color: "var(--ch-text-2)" }}>#{run.id}</span></td>
                    <td style={{ padding: "10px 14px" }}><span className="mono" style={{ color: "var(--ch-text-2)" }}>action#{run.action_id}</span></td>
                    <td style={{ padding: "10px 14px" }}><Pill color={m.c} bg={m.bg} border={m.b}>{m.l}</Pill></td>
                    <td style={{ padding: "10px 14px" }}><span className="mono" style={{ color: run.exit_code === 0 ? "var(--ch-green-2)" : "var(--ch-red)" }}>{run.exit_code ?? "—"}</span></td>
                    <td style={{ padding: "10px 14px" }}><span style={{ color: "var(--ch-text-3)", fontSize: 11.5 }}>{fmtDate(run.started_at)}</span></td>
                    <td style={{ padding: "10px 14px" }}><span style={{ color: "var(--ch-text-3)", fontSize: 11.5 }}>{fmtDate(run.finished_at)}</span></td>
                    <td style={{ padding: "10px 14px" }}>
                      <button onClick={() => setSelected(run)} style={{ padding: "5px 9px", borderRadius: 6, background: "transparent", border: "1px solid var(--line)", color: "var(--ch-text-3)", fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}>
                        Ver
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  )
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ══════════════════════════════════════════════════════════════ */
export default function DeviceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const deviceId = parseInt(id, 10)

  const RANGE_MINUTES: Record<string, number> = {
    "Últimos 1 minuto": 1,
    "Últimos 5 minutos": 5,
    "Últimos 10 minutos": 10,
    "Últimos 15 minutos": 15,
    "Últimos 20 minutos": 20,
    "Últimos 30 minutos": 30,
    "Últimos 45 minutos": 45,
    "Última hora": 60,
  }

  const [activeTab, setActiveTab] = useState("Resumen")
  const [range, setRange] = useState("Últimos 5 minutos")
  const [rangeOpen, setRangeOpen] = useState(false)

  const rangeMinutes = RANGE_MINUTES[range] ?? 5
  const fromTs = useMemo(
    () => new Date(Date.now() - rangeMinutes * 60 * 1000).toISOString(),
    [rangeMinutes]
  )

  const { data: device, isLoading } = useDevice(deviceId)
  const { data: deviceStatus, refetch: refetchStatus } = useDeviceStatus(deviceId)
  const { data: metrics, refetch: refetchMetrics } = useDeviceMetrics(deviceId, { from_ts: fromTs, limit: Math.min(500, rangeMinutes * 12) })
  const { connect, onMessage } = useWebSocket()
  const [liveMetric, setLiveMetric] = useState<{ cpu_percent: number; ram_percent: number; disk_percent: number; uptime_seconds: number; created_at: string } | null>(null)
  const [liveMetrics, setLiveMetrics] = useState<Array<{ cpu_percent: number; ram_percent: number; disk_percent: number; uptime_seconds: number; created_at: string }>>([])
  const [liveOnline, setLiveOnline] = useState<boolean | null>(null)

  useEffect(() => {
    connect()
  }, [connect])

  useEffect(() => {
    const unsubscribe = onMessage((message) => {
      const targetDeviceId = Number(message.device_id)
      if (targetDeviceId !== deviceId) return

      if (message.type === "client.device.metric.updated") {
        const metric = message.metric as {
          cpu_percent: number
          ram_percent: number
          disk_percent: number
          uptime_seconds: number
          created_at: string
        }

        setLiveMetric(metric)
        setLiveMetrics((prev) => [...prev, metric].slice(-30))
      }

      if (message.type === "client.device.status.updated") {
        setLiveOnline(Boolean(message.is_online))
      }
    })
    return unsubscribe
  }, [deviceId, onMessage])

  useEffect(() => {
    if (deviceStatus?.latest_metric) {
      setLiveMetric(deviceStatus.latest_metric)
    }
  }, [deviceStatus?.latest_metric])

  useEffect(() => {
    if (typeof device?.is_online === "boolean") {
      setLiveOnline(device.is_online)
    }
  }, [device?.is_online])

  const latestMetric = liveMetric ?? deviceStatus?.latest_metric ?? null
  const mergedMetrics = useMemo(() => {
    const seen = new Set<string>()
    const all = [...(metrics ?? []), ...liveMetrics].filter((m) => {
      if (seen.has(m.created_at)) return false
      seen.add(m.created_at)
      return true
    })
    all.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    return all.slice(-Math.min(500, rangeMinutes * 12))
  }, [metrics, liveMetrics, rangeMinutes])
  const sparkData = buildSparkData(mergedMetrics)
  const isDeviceOnline = liveOnline ?? device?.is_online ?? false

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--ch-text-3)", fontSize: 14 }}>
        Cargando dispositivo…
      </div>
    )
  }

  if (!device) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--ch-text-3)", fontSize: 14 }}>
        Dispositivo no encontrado.{" "}
        <button onClick={() => router.back()} style={{ color: "var(--ch-blue-2)", background: "none", border: "none", cursor: "pointer", marginLeft: 8 }}>Volver</button>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Device header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 24px",
        borderBottom: "1px solid var(--line)",
        background: "rgba(10,14,26,0.5)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 12,
            background: "linear-gradient(180deg, rgba(59,130,246,0.18), rgba(139,92,246,0.10))",
            border: "1px solid var(--line-strong)",
            display: "grid", placeItems: "center", color: "var(--ch-blue-2)",
          }}>
            {ICON_SERVER}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 26, fontWeight: 700, color: "#fff", letterSpacing: -0.3 }}>{device.name}</span>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "3px 10px", borderRadius: 999,
                background: isDeviceOnline ? "rgba(34,197,94,0.10)" : "rgba(239,68,68,0.10)",
                border: isDeviceOnline ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(239,68,68,0.3)",
                color: isDeviceOnline ? "var(--ch-green-2)" : "var(--ch-red)",
                fontSize: 12, fontWeight: 600,
              }}>
                <StatusDot online={isDeviceOnline} />
                {isDeviceOnline ? "En línea" : "Desconectado"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 13, color: "var(--ch-text-3)", marginTop: 4 }}>
              {device.os_name && <span>{device.os_name}</span>}
              {device.host_type && <><span style={{ color: "var(--ch-text-4)" }}>·</span><span>{device.host_type}</span></>}
              {device.agent_version && <><span style={{ color: "var(--ch-text-4)" }}>·</span><span className="mono">v{device.agent_version}</span></>}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => router.push(`/terminal/${device.id}`)} style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "8px 14px", borderRadius: 10,
            background: "rgba(255,255,255,0.025)", border: "1px solid var(--line)",
            color: "var(--ch-text)", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
          }}>
            {ICON_TERMINAL} Terminal
          </button>
          <button
            onClick={() => { refetchMetrics(); refetchStatus() }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "8px 14px", borderRadius: 10,
              background: "rgba(255,255,255,0.025)", border: "1px solid var(--line)",
              color: "var(--ch-text)", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {ICON_REFRESH} Actualizar
          </button>
        </div>
      </div>

      {/* Tabs bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px",
        borderBottom: "1px solid var(--line)",
        background: "rgba(10,14,26,0.35)",
      }}>
        {/* Tab buttons */}
        <div style={{ display: "flex", alignItems: "center" }}>
          {TABS.map((t) => {
            const on = t === activeTab
            return (
              <button key={t} onClick={() => setActiveTab(t)} style={{
                padding: "14px 14px 12px", position: "relative",
                background: "transparent", border: 0,
                color: on ? "#fff" : "var(--ch-text-3)",
                fontSize: 13, fontWeight: on ? 600 : 500, cursor: "pointer",
                fontFamily: "inherit",
              }}>
                {t}
                {on && (
                  <div style={{
                    position: "absolute", left: 12, right: 12, bottom: 0, height: 2,
                    background: "linear-gradient(90deg, var(--ch-blue), var(--ch-violet))",
                    borderRadius: 2, boxShadow: "0 0 10px rgba(59,130,246,0.55)",
                  }} />
                )}
              </button>
            )
          })}
        </div>

        {/* Right side: range + status */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setRangeOpen(o => !o)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "7px 12px", borderRadius: 9,
                background: rangeOpen ? "rgba(59,130,246,0.08)" : "rgba(255,255,255,0.025)",
                border: "1px solid " + (rangeOpen ? "rgba(59,130,246,0.4)" : "var(--line)"),
                color: "var(--ch-text)", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {range}
              <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, color: "var(--ch-text-3)", transform: rangeOpen ? "rotate(180deg)" : "none", transition: "transform 180ms" }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>

            {rangeOpen && (
              <>
                {/* backdrop to close */}
                <div style={{ position: "fixed", inset: 0, zIndex: 10 }} onClick={() => setRangeOpen(false)} />
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 20,
                  background: "linear-gradient(180deg, rgba(20,27,49,0.98), rgba(13,18,34,0.98))",
                  border: "1px solid var(--line)", borderRadius: 10,
                  boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
                  minWidth: 180, overflow: "hidden",
                }}>
                  {[
                    "Últimos 1 minuto",
                    "Últimos 5 minutos",
                    "Últimos 10 minutos",
                    "Últimos 15 minutos",
                    "Últimos 20 minutos",
                    "Últimos 30 minutos",
                    "Últimos 45 minutos",
                    "Última hora",
                  ].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => { setRange(opt); setRangeOpen(false) }}
                      style={{
                        width: "100%", display: "block", textAlign: "left",
                        padding: "9px 14px", background: opt === range ? "rgba(59,130,246,0.12)" : "transparent",
                        border: 0, borderBottom: "1px solid var(--line)",
                        color: opt === range ? "var(--ch-blue-2)" : "var(--ch-text)",
                        fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                      }}
                      onMouseEnter={(e) => { if (opt !== range) e.currentTarget.style.background = "rgba(255,255,255,0.04)" }}
                      onMouseLeave={(e) => { if (opt !== range) e.currentTarget.style.background = "transparent" }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ch-green-2)" }}>
            <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}>
              <span className="pulse" style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--ch-green)", boxShadow: "0 0 8px var(--ch-green)" }} />
            </span>
            Actualizando…
          </span>
        </div>
      </div>

      {/* Tab content */}
      <div className="ch-scroll" style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
        {activeTab === "Resumen" && <ResumenTab device={device} status={latestMetric} sparkData={sparkData} rangeMinutes={rangeMinutes} />}
        {activeTab === "Métricas" && <MetricasTab sparkData={sparkData} mergedMetrics={mergedMetrics} metricsCount={mergedMetrics.length} rangeMinutes={rangeMinutes} />}
        {activeTab === "Acciones" && <AccionesTab deviceId={deviceId} />}
        {activeTab === "Historial" && <HistorialTab deviceId={deviceId} />}
        {activeTab === "Procesos" && <ProcesosTab />}
        {activeTab === "Servicios" && <ServiciosTab />}
        {activeTab === "Registros" && <RegistrosTab />}
        {activeTab === "Alertas" && <AlertasTab />}
        {activeTab === "Configuración" && <ConfiguracionTab device={device} />}
      </div>
    </div>
  )
}
