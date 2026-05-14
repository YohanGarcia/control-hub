"use client"

import { use, useState, useEffect, useCallback, useRef } from "react"
import { useDevice, useDeviceStatus } from "@/hooks/useDevices"
import { TerminalTabs } from "@/components/terminal"
import { Sparkline } from "@/components/shared/sparkline"
import { useWebSocket } from "@/components/providers/websocket-provider"

function StatusDot({ online }: { online: boolean }) {
  const c = online ? "var(--ch-green)" : "var(--ch-red)"
  return (
    <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}>
      <span className={online ? "pulse" : ""} style={{ position: "absolute", inset: 0, borderRadius: "50%", background: c, boxShadow: `0 0 8px ${c}` }} />
    </span>
  )
}

const ICON_TERMINAL = (
  <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, color: "var(--ch-blue-2)" }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="6" width="16" height="12"/><path d="M7 10l3 2-3 2"/><path d="M13 14h4"/>
  </svg>
)
const ICON_SIDEBAR = (
  <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>
  </svg>
)

function fmtElapsed(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export default function TerminalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const deviceId = parseInt(id, 10)

  const { data: device } = useDevice(deviceId)
  const { data: status } = useDeviceStatus(deviceId)
  const { connect, onMessage } = useWebSocket()

  const [rightOpen, setRightOpen] = useState(true)
  const [cmdHistory, setCmdHistory] = useState<string[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [liveMetric, setLiveMetric] = useState<{ cpu_percent: number; ram_percent: number; disk_percent: number } | null>(null)
  const [sparkCpu, setSparkCpu] = useState<number[]>([])
  const [sparkRam, setSparkRam] = useState<number[]>([])
  const [sparkDisk, setSparkDisk] = useState<number[]>([])

  const latestMetric = liveMetric ?? status?.latest_metric ?? null

  // Session timer
  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // Connect WebSocket
  useEffect(() => { connect() }, [connect])

  // Listen for live metric updates
  useEffect(() => {
    return onMessage((msg) => {
      if (msg.type === "client.device.metric.updated" && Number(msg.device_id) === deviceId) {
        const m = msg.metric as { cpu_percent: number; ram_percent: number; disk_percent: number }
        setLiveMetric(m)
        setSparkCpu((prev) => [...prev, m.cpu_percent].slice(-30))
        setSparkRam((prev) => [...prev, m.ram_percent].slice(-30))
        setSparkDisk((prev) => [...prev, m.disk_percent].slice(-30))
      }
    })
  }, [deviceId, onMessage])

  // Seed sparklines from REST metric when WS hasn't sent data yet
  useEffect(() => {
    if (status?.latest_metric && sparkCpu.length === 0) {
      const m = status.latest_metric
      setSparkCpu(Array.from({ length: 10 }, () => m.cpu_percent))
      setSparkRam(Array.from({ length: 10 }, () => m.ram_percent))
      setSparkDisk(Array.from({ length: 10 }, () => m.disk_percent))
    }
  }, [status?.latest_metric, sparkCpu.length])

  const host = device
    ? `${device.host_type === "ubuntu" ? "root" : "admin"}@${device.name.toLowerCase().replace(/\s+/g, "-")}`
    : `device-${deviceId}`

  const handleHistoryChange = useCallback((h: string[]) => setCmdHistory(h), [])

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Top bar */}
      <div style={{
        borderBottom: "1px solid var(--line)",
        background: "rgba(10,14,26,0.6)",
        backdropFilter: "blur(14px)",
        flexShrink: 0,
      }}>
        {/* Breadcrumb + mini-metrics row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--ch-text-3)", fontSize: 13, cursor: "pointer" }}
              onClick={() => history.back()}
            >
              <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              Dispositivos
            </span>
            <span style={{ color: "var(--ch-text-4)" }}>/</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {ICON_TERMINAL}
              <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Terminal</span>
              <span style={{ color: "var(--ch-text-4)" }}>·</span>
              <span className="mono" style={{ fontSize: 12, color: "var(--ch-text-2)" }}>{host}</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* CPU mini */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "6px 10px", borderRadius: 8, background: "rgba(255,255,255,0.025)", border: "1px solid var(--line)" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 9, color: "var(--ch-text-3)", letterSpacing: 1.2, fontWeight: 600 }}>CPU</span>
                <span className="mono" style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>{latestMetric ? `${latestMetric.cpu_percent.toFixed(0)}%` : "—"}</span>
              </div>
              <Sparkline data={sparkCpu.length >= 2 ? sparkCpu : [0, 0]} color="var(--ch-blue)" width={64} height={20} />
            </div>
            {/* RAM mini */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "6px 10px", borderRadius: 8, background: "rgba(255,255,255,0.025)", border: "1px solid var(--line)" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 9, color: "var(--ch-text-3)", letterSpacing: 1.2, fontWeight: 600 }}>RAM</span>
                <span className="mono" style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>{latestMetric ? `${latestMetric.ram_percent.toFixed(0)}%` : "—"}</span>
              </div>
              <Sparkline data={sparkRam.length >= 2 ? sparkRam : [0, 0]} color="var(--ch-green)" width={64} height={20} />
            </div>

            <div style={{ width: 1, height: 26, background: "var(--line)", margin: "0 4px" }} />

            {/* Connection pill */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px",
              borderRadius: 999,
              background: device?.is_online ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
              border: device?.is_online ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(239,68,68,0.3)",
              color: device?.is_online ? "var(--ch-green-2)" : "var(--ch-red)",
              fontSize: 12, fontWeight: 600,
            }}>
              <StatusDot online={device?.is_online ?? false} />
              {device?.is_online ? "Conectado" : "Desconectado"}
            </div>

            {/* Panel toggle */}
            <button onClick={() => setRightOpen(v => !v)} style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8,
              border: "1px solid var(--line)",
              background: rightOpen ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.02)",
              color: rightOpen ? "var(--ch-violet-2)" : "var(--ch-text-2)",
              fontSize: 12, cursor: "pointer", fontFamily: "inherit",
            }}>
              {ICON_SIDEBAR} Panel
            </button>
          </div>
        </div>

        {/* Session tab row */}
        <div style={{ display: "flex", alignItems: "center", padding: "10px 14px 0", gap: 4 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "8px 10px 8px 12px",
            borderTopLeftRadius: 10, borderTopRightRadius: 10,
            background: "var(--bg-2, #0f1424)",
            border: "1px solid var(--line)",
            borderBottomColor: "var(--bg-2, #0f1424)",
            marginBottom: -1, position: "relative", minWidth: 200,
          }}>
            <div style={{ position: "absolute", left: 10, right: 10, top: 0, height: 2, background: "linear-gradient(90deg, var(--ch-blue), var(--ch-violet))", borderRadius: 2, boxShadow: "0 0 10px rgba(59,130,246,0.6)" }} />
            <StatusDot online={device?.is_online ?? false} />
            <span className="mono" style={{ fontSize: 12, color: "#fff" }}>{host}: ~</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--ch-text-4)", marginLeft: 8 }}>{fmtElapsed(elapsed)}</span>
          </div>
        </div>
      </div>

      {/* Terminal + right panel */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Terminal */}
        <div style={{ flex: 1, background: "rgba(7,10,20,0.85)", minWidth: 0 }}>
          <TerminalTabs deviceId={deviceId} hostname={host} onHistoryChange={handleHistoryChange} />
        </div>

        {/* Right info panel */}
        {rightOpen && device && (
          <div style={{
            width: 288, display: "flex", flexDirection: "column",
            borderLeft: "1px solid var(--line)",
            background: "rgba(10,14,26,0.6)",
            backdropFilter: "blur(14px)",
            flexShrink: 0,
            overflowY: "auto",
          }}
            className="ch-scroll"
          >
            {/* Server info */}
            <div style={{ padding: 16, borderBottom: "1px solid var(--line)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.35)", display: "grid", placeItems: "center", color: "var(--ch-blue-2)" }}>
                  <svg viewBox="0 0 24 24" style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="7" rx="1.5"/><rect x="3" y="13" width="18" height="7" rx="1.5"/><path d="M7 7.5h.01M7 16.5h.01"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{device.name}</div>
                  <div style={{ fontSize: 11, display: "inline-flex", alignItems: "center", gap: 6, color: device.is_online ? "var(--ch-green-2)" : "var(--ch-red)" }}>
                    <StatusDot online={device.is_online} />
                    {device.is_online ? "En línea" : "Desconectado"}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 12, rowGap: 6, fontSize: 12 }}>
                <span style={{ color: "var(--ch-text-3)" }}>Host</span>
                <span className="mono" style={{ color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{host}</span>
                <span style={{ color: "var(--ch-text-3)" }}>OS</span>
                <span style={{ color: "#fff" }}>{device.os_name ?? device.host_type}</span>
                <span style={{ color: "var(--ch-text-3)" }}>Tipo</span>
                <span style={{ color: "#fff" }}>{device.host_type}</span>
                {device.agent_version && (
                  <>
                    <span style={{ color: "var(--ch-text-3)" }}>Agente</span>
                    <span className="mono" style={{ color: "#fff" }}>v{device.agent_version}</span>
                  </>
                )}
              </div>
            </div>

            {/* Live metrics */}
            <div style={{ padding: 16, borderBottom: "1px solid var(--line)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 10, letterSpacing: 1.3, color: "var(--ch-text-3)", fontWeight: 600 }}>MÉTRICAS EN VIVO</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--ch-green-2)" }}>
                  <StatusDot online /> 15s
                </span>
              </div>
              {[
                { label: "CPU",   value: latestMetric?.cpu_percent ?? 0,  color: "var(--ch-blue)",   data: sparkCpu },
                { label: "RAM",   value: latestMetric?.ram_percent ?? 0,  color: "var(--ch-green)",  data: sparkRam },
                { label: "DISCO", value: latestMetric?.disk_percent ?? 0, color: "var(--ch-violet)", data: sparkDisk },
              ].map((m) => (
                <div key={m.label} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: "var(--ch-text-3)", letterSpacing: 1.1, fontWeight: 600 }}>{m.label}</span>
                    <span className="mono" style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{m.value.toFixed(0)}%</span>
                  </div>
                  <Sparkline data={m.data.length >= 2 ? m.data : [m.value, m.value]} color={m.color} width={256} height={26} />
                </div>
              ))}
            </div>

            {/* SSH connection */}
            <div style={{ padding: 16, borderBottom: "1px solid var(--line)" }}>
              <div style={{ fontSize: 10, letterSpacing: 1.3, color: "var(--ch-text-3)", fontWeight: 600, marginBottom: 10 }}>CONEXIÓN SSH</div>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 12, rowGap: 8, fontSize: 12 }}>
                <span style={{ color: "var(--ch-text-3)" }}>Cifrado</span>
                <span className="mono" style={{ color: "#fff", fontSize: 11 }}>ED25519 · AES-256-GCM</span>
                <span style={{ color: "var(--ch-text-3)" }}>Sesión</span>
                <span className="mono" style={{ color: "#fff" }}>{fmtElapsed(elapsed)}</span>
                <span style={{ color: "var(--ch-text-3)" }}>Latencia</span>
                <span className="mono" style={{ color: "var(--ch-green-2)" }}>{"< 5 ms"}</span>
                <span style={{ color: "var(--ch-text-3)" }}>Auth</span>
                <span style={{ color: "var(--ch-green-2)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <svg viewBox="0 0 24 24" style={{ width: 11, height: 11 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                  Agente + clave
                </span>
              </div>
            </div>

            {/* Quick actions */}
            <div style={{ padding: 16, borderBottom: "1px solid var(--line)" }}>
              <div style={{ fontSize: 10, letterSpacing: 1.3, color: "var(--ch-text-3)", fontWeight: 600, marginBottom: 10 }}>ACCIONES RÁPIDAS</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { label: "Reiniciar", icon: <svg viewBox="0 0 24 24" style={{ width: 13, height: 13 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M4 12a8 8 0 0114-5.3L20 8M20 4v4h-4M20 12a8 8 0 01-14 5.3L4 16M4 20v-4h4"/></svg> },
                  { label: "Detener",   icon: <svg viewBox="0 0 24 24" style={{ width: 13, height: 13 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> },
                  { label: "Logs auth", icon: <svg viewBox="0 0 24 24" style={{ width: 13, height: 13 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
                  { label: "Archivos",  icon: <svg viewBox="0 0 24 24" style={{ width: 13, height: 13 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg> },
                ].map((a) => (
                  <button key={a.label} style={{
                    display: "inline-flex", alignItems: "center", gap: 7,
                    padding: "8px 10px", borderRadius: 8,
                    background: "rgba(255,255,255,0.025)", border: "1px solid var(--line)",
                    color: "var(--ch-text-2)", cursor: "pointer", fontSize: 12,
                    fontFamily: "inherit",
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "var(--line-strong)" }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--ch-text-2)"; e.currentTarget.style.borderColor = "var(--line)" }}
                  >
                    {a.icon} {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Command history */}
            <div style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column", minHeight: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 10, letterSpacing: 1.3, color: "var(--ch-text-3)", fontWeight: 600 }}>HISTORIAL</span>
                <span style={{ fontSize: 11, color: "var(--ch-text-4)" }}>{cmdHistory.length} cmds</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {cmdHistory.length === 0 ? (
                  <span style={{ fontSize: 12, color: "var(--ch-text-4)" }}>Sin comandos aún</span>
                ) : (
                  [...cmdHistory].reverse().slice(0, 10).map((cmd, i) => (
                    <button
                      key={`${cmd}-${i}`}
                      className="mono"
                      style={{
                        textAlign: "left", fontSize: 12, color: "var(--ch-text-2)",
                        padding: "6px 8px", borderRadius: 6, cursor: "pointer",
                        border: 0, background: "transparent", fontFamily: "monospace",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#fff" }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--ch-text-2)" }}
                    >
                      $ {cmd}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
