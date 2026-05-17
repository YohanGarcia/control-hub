"use client"

import { useEffect, useMemo, useState } from "react"
import { useDevices, useDeviceContainerEvents, useDeviceContainers } from "@/hooks/useDevices"
import { useWebSocket } from "@/components/providers/websocket-provider"

type LiveEvent = {
  id: string
  ts: string
  severity: string
  eventType: string
  summary: string
  containerId?: string
}

export default function OpsCenterPage() {
  const { data: devices } = useDevices()
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null)
  const { connect, onMessage } = useWebSocket()

  useEffect(() => {
    connect()
  }, [connect])

  useEffect(() => {
    if (!selectedDeviceId && devices?.length) {
      setSelectedDeviceId(devices[0].id)
    }
  }, [devices, selectedDeviceId])

  const { data: containers = [] } = useDeviceContainers(selectedDeviceId ?? 0)
  const { data: events = [] } = useDeviceContainerEvents(selectedDeviceId ?? 0, 160)
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([])

  useEffect(() => {
    return onMessage((msg) => {
      const eventType = String(msg.type || "")
      const deviceId = Number(msg.device_id)
      if (!selectedDeviceId || deviceId !== selectedDeviceId) return
      if (eventType !== "client.docker.event.created") return

      const payload = (msg as { container?: { container_id?: string; name?: string }; event_type?: string }).container
      const containerId = payload?.container_id
      const name = payload?.name || containerId || "container"
      setLiveEvents((prev) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          ts: new Date().toISOString(),
          severity: "info",
          eventType: String((msg as { event_type?: string }).event_type || "docker_event"),
          summary: `${name} actualizado`,
          containerId,
        },
        ...prev,
      ].slice(0, 80))
    })
  }, [onMessage, selectedDeviceId])

  const timeline = useMemo(() => {
    const dbEvents: LiveEvent[] = events.map((e) => ({
      id: `db-${e.id}`,
      ts: e.created_at,
      severity: e.severity,
      eventType: e.event_type,
      summary: e.summary,
      containerId: e.container_id,
    }))
    return [...liveEvents, ...dbEvents]
      .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
      .slice(0, 120)
  }, [events, liveEvents])

  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, color: "#fff" }}>Ops Center</h1>
          <div style={{ fontSize: 12, color: "var(--ch-text-3)" }}>Monitoreo de contenedores Docker por servidor</div>
        </div>
        <select
          value={selectedDeviceId ?? ""}
          onChange={(e) => setSelectedDeviceId(Number(e.target.value))}
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--line)", color: "#fff", borderRadius: 8, padding: "7px 10px" }}
        >
          {(devices ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
        <div style={{ border: "1px solid var(--line)", borderRadius: 12, background: "rgba(15,20,36,0.6)", overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)", color: "#fff", fontWeight: 600 }}>Contenedores ({containers.length})</div>
          <div className="ch-scroll" style={{ maxHeight: 520, overflowY: "auto" }}>
            {containers.map((c) => (
              <div key={c.container_id} style={{ padding: "10px 14px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div className="mono" style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>{c.name}</div>
                  <div className="mono" style={{ color: "var(--ch-text-3)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis" }}>{c.image}</div>
                </div>
                <div style={{ fontSize: 11, color: c.state === "running" ? "var(--ch-green-2)" : "var(--ch-red)", whiteSpace: "nowrap" }}>{c.state}</div>
              </div>
            ))}
            {containers.length === 0 && <div style={{ padding: 14, color: "var(--ch-text-3)", fontSize: 12 }}>Sin contenedores reportados.</div>}
          </div>
        </div>

        <div style={{ border: "1px solid var(--line)", borderRadius: 12, background: "rgba(15,20,36,0.6)", overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)", color: "#fff", fontWeight: 600 }}>Timeline Docker</div>
          <div className="ch-scroll" style={{ maxHeight: 520, overflowY: "auto", display: "flex", flexDirection: "column" }}>
            {timeline.map((e) => (
              <div key={e.id} style={{ padding: "10px 14px", borderTop: "1px solid var(--line)", display: "grid", gridTemplateColumns: "90px 1fr", gap: 10 }}>
                <div className="mono" style={{ color: "var(--ch-text-4)", fontSize: 11 }}>{new Date(e.ts).toLocaleTimeString()}</div>
                <div>
                  <div style={{ fontSize: 12, color: "#fff" }}>{e.summary}</div>
                  <div className="mono" style={{ fontSize: 10.5, color: "var(--ch-text-3)" }}>{e.eventType}{e.containerId ? ` · ${e.containerId.slice(0, 12)}` : ""}</div>
                </div>
              </div>
            ))}
            {timeline.length === 0 && <div style={{ padding: 14, color: "var(--ch-text-3)", fontSize: 12 }}>Sin eventos aún.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
