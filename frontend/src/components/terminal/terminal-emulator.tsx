"use client"

import { useEffect, useRef, useState, useCallback, startTransition } from "react"
import { useWebSocketContext } from "@/components/providers/websocket-provider"

interface TerminalEmulatorProps {
  deviceId: number
  hostname: string
  onHistoryChange?: (history: string[]) => void
}

function ToolBtn({
  label, onClick, active, danger, children,
}: { label: string; onClick: () => void; active?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      title={label}
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "5px 9px", borderRadius: 7,
        background: danger ? "rgba(239,68,68,0.10)" : active ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.02)",
        border: "1px solid " + (danger ? "rgba(239,68,68,0.3)" : "var(--line)"),
        color: danger ? "var(--ch-red)" : active ? "var(--ch-violet-2)" : "var(--ch-text-2)",
        cursor: "pointer", fontSize: 12, fontFamily: "inherit",
      }}
      onMouseEnter={(e) => {
        if (!danger && !active) (e.currentTarget as HTMLElement).style.color = "var(--ch-text)"
      }}
      onMouseLeave={(e) => {
        if (!danger && !active) (e.currentTarget as HTMLElement).style.color = "var(--ch-text-2)"
      }}
    >
      {children}
    </button>
  )
}

export function TerminalEmulator({ deviceId, hostname, onHistoryChange }: TerminalEmulatorProps) {
  const sessionIdRef = useRef<string | null>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [buffer, setBuffer] = useState("")
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected")
  const [history, setHistory] = useState<string[]>([])
  const [historyCursor, setHistoryCursor] = useState(-1)
  const [usageMap, setUsageMap] = useState<Record<string, number>>({})
  const [follow, setFollow] = useState(true)

  const { isConnected, connect, sendMessage, onMessage } = useWebSocketContext()
  const historyKey = `terminal_history_${deviceId}`
  const usageKey = `terminal_usage_${deviceId}`

  useEffect(() => {
    try {
      const rawHistory = localStorage.getItem(historyKey)
      const rawUsage = localStorage.getItem(usageKey)
      const parsedHistory = rawHistory ? (JSON.parse(rawHistory) as string[]) : []
      const parsedUsage = rawUsage ? (JSON.parse(rawUsage) as Record<string, number>) : {}
      startTransition(() => {
        setHistory(Array.isArray(parsedHistory) ? parsedHistory.slice(-100) : [])
        setUsageMap(parsedUsage && typeof parsedUsage === "object" ? parsedUsage : {})
      })
    } catch {}
  }, [historyKey, usageKey])

  useEffect(() => {
    try { localStorage.setItem(historyKey, JSON.stringify(history.slice(-100))) } catch {}
    onHistoryChange?.(history)
  }, [history, historyKey, onHistoryChange])

  useEffect(() => {
    try { localStorage.setItem(usageKey, JSON.stringify(usageMap)) } catch {}
  }, [usageMap, usageKey])

  const append = useCallback((text: string) => {
    setBuffer((prev) => `${prev}${text}`.slice(-40000))
  }, [])

  const handleMsg = useCallback((msg: unknown) => {
    const m = msg as { type: string; data?: Record<string, unknown> }
    if (m.type === "server.terminal.started") {
      const sid = m.data?.session_id as string | undefined
      if (sid) {
        sessionIdRef.current = sid
        setSessionId(sid)
        setStatus("connected")
        append("[Session started]\n")
      }
      return
    }
    if (m.type === "client.terminal.output") {
      const sid = m.data?.session_id as string | undefined
      const chunk = m.data?.chunk
      if (sid === sessionIdRef.current && typeof chunk === "string" && chunk) {
        append(chunk)
      }
      return
    }
    if (m.type === "client.terminal.exit") {
      const sid = m.data?.session_id as string | undefined
      if (sid === sessionIdRef.current) {
        append(`\n[Session ended: exit_code=${m.data?.exit_code ?? 0}]\n`)
        sessionIdRef.current = null
        setSessionId(null)
        setStatus("disconnected")
      }
      return
    }
  }, [append])

  useEffect(() => onMessage(handleMsg), [onMessage, handleMsg])

  useEffect(() => {
    if (!follow || !outputRef.current) return
    outputRef.current.scrollTop = outputRef.current.scrollHeight
  }, [buffer, follow])

  useEffect(() => {
    if (isConnected && !sessionId) {
      startTransition(() => setStatus("connecting"))
      sendMessage({ type: "client.terminal.start", data: { device_id: deviceId, shell: "default" } })
    }
  }, [isConnected, deviceId, sessionId, sendMessage])

  const onScroll = () => {
    const el = outputRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    if (!atBottom) setFollow(false)
    if (atBottom) setFollow(true)
  }

  const sendInput = () => {
    if (!sessionId || !input.trim()) return
    const cmd = input.trim()
    if (cmd === "clear") {
      setBuffer("")
      setInput("")
      setHistoryCursor(-1)
      return
    }
    setHistory((prev) => [...prev.filter((p) => p !== cmd), cmd].slice(-100))
    setUsageMap((prev) => ({ ...prev, [cmd]: (prev[cmd] ?? 0) + 1 }))
    setHistoryCursor(-1)
    sendMessage({ type: "client.terminal.input", data: { session_id: sessionId, input: `${cmd}\n` } })
    setInput("")
  }

  const stopSession = () => {
    if (!sessionId) return
    sendMessage({ type: "client.terminal.stop", data: { session_id: sessionId } })
  }

  const statusColor =
    status === "connected" ? "var(--ch-green-2)"
    : status === "connecting" ? "var(--ch-amber)"
    : "var(--ch-text-3)"

  const eventsCount = buffer.split("\n").length

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 14px", borderBottom: "1px solid var(--line)",
        background: "rgba(15,20,36,0.6)", fontSize: 12, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="mono" style={{ color: "var(--ch-text-3)" }}>~</span>
          <span style={{ color: "var(--ch-text-4)" }}>·</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: statusColor }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor, display: "inline-block" }} />
            {status === "connected" ? "Conectado" : status === "connecting" ? "Conectando…" : "Desconectado"}
          </span>
          <span style={{ color: "var(--ch-text-4)" }}>·</span>
          <span className="mono" style={{ color: "var(--ch-text-3)" }}>{eventsCount} líneas</span>
          {!isConnected && (
            <>
              <span style={{ color: "var(--ch-text-4)" }}>·</span>
              <button
                onClick={() => connect()}
                style={{ background: "none", border: "none", color: "var(--ch-blue-2)", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}
              >
                Conectar
              </button>
            </>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ToolBtn label="Copiar" onClick={() => navigator.clipboard?.writeText(buffer)}>
            <svg viewBox="0 0 24 24" style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
          </ToolBtn>
          <ToolBtn label="Descargar log" onClick={() => {
            const blob = new Blob([buffer], { type: "text/plain" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url; a.download = `terminal-${hostname}-${Date.now()}.log`; a.click()
            URL.revokeObjectURL(url)
          }}>
            <svg viewBox="0 0 24 24" style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </ToolBtn>
          <ToolBtn label="Limpiar" onClick={() => setBuffer("")}>
            <svg viewBox="0 0 24 24" style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/>
            </svg>
          </ToolBtn>
          {sessionId && (
            <ToolBtn label="Detener sesión" onClick={stopSession} danger>
              <svg viewBox="0 0 24 24" style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
              </svg>
              Detener
            </ToolBtn>
          )}
        </div>
      </div>

      {/* Output */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <div
          ref={outputRef}
          onScroll={onScroll}
          className="ch-scroll mono"
          style={{
            height: "100%", overflowY: "auto",
            padding: "16px 18px 100px",
            fontSize: 12.5, lineHeight: 1.6,
            color: "var(--ch-text-2)",
            whiteSpace: "pre-wrap", wordBreak: "break-all",
          }}
        >
          {buffer
            ? buffer
            : <span style={{ color: "var(--ch-text-4)" }}>Esperando conexión…</span>
          }
          {status === "connected" && (
            <span style={{ display: "inline-flex", alignItems: "baseline" }}>
              <span style={{ color: "var(--ch-green-2)" }}>{hostname}</span>
              <span style={{ color: "var(--ch-text-3)" }}>:</span>
              <span style={{ color: "var(--ch-blue-2)" }}>~</span>
              <span style={{ color: "var(--ch-text-3)", marginRight: 4 }}>$</span>
              <span className="caret" />
            </span>
          )}
        </div>

        {!follow && (
          <button
            onClick={() => {
              setFollow(true)
              if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight
            }}
            style={{
              position: "absolute", bottom: 100, left: "50%", transform: "translateX(-50%)",
              padding: "6px 14px", borderRadius: 999,
              background: "rgba(59,130,246,0.18)", border: "1px solid rgba(59,130,246,0.45)",
              color: "var(--ch-blue-2)", fontSize: 12, fontWeight: 600, cursor: "pointer",
              backdropFilter: "blur(10px)",
              boxShadow: "0 6px 20px rgba(59,130,246,0.3)",
              whiteSpace: "nowrap",
            }}
          >
            ↓ Saltar a tiempo real
          </button>
        )}
      </div>

      {/* Command input */}
      <div style={{
        margin: "0 18px 18px",
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 12px",
        background: "linear-gradient(180deg, rgba(20,27,49,0.92), rgba(13,18,34,0.92))",
        border: "1px solid rgba(59,130,246,0.28)",
        borderRadius: 12,
        backdropFilter: "blur(12px)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.45), 0 0 24px rgba(59,130,246,0.10), inset 0 0 16px rgba(59,130,246,0.06)",
        flexShrink: 0,
      }}>
        <span className="mono" style={{ display: "inline-flex", alignItems: "baseline", fontSize: 13, flexShrink: 0 }}>
          <span style={{ color: "var(--ch-green-2)" }}>{hostname}</span>
          <span style={{ color: "var(--ch-text-3)" }}>:</span>
          <span style={{ color: "var(--ch-blue-2)" }}>~</span>
          <span style={{ color: "var(--ch-text-3)", marginRight: 4 }}>$</span>
        </span>
        <input
          value={input}
          onChange={(e) => { setInput(e.target.value); setHistoryCursor(-1) }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { sendInput(); return }
            if (e.key === "ArrowUp") {
              e.preventDefault()
              if (!history.length) return
              const next = historyCursor < history.length - 1 ? historyCursor + 1 : historyCursor
              setHistoryCursor(next)
              setInput(history[history.length - 1 - next] ?? "")
              return
            }
            if (e.key === "ArrowDown") {
              e.preventDefault()
              if (historyCursor <= 0) { setHistoryCursor(-1); setInput(""); return }
              const next = historyCursor - 1
              setHistoryCursor(next)
              setInput(history[history.length - 1 - next] ?? "")
            }
            if ((e.ctrlKey || e.metaKey) && e.key === "l") { e.preventDefault(); setBuffer("") }
          }}
          placeholder="Escribe un comando… (help, status, ps, docker ps)"
          className="mono"
          spellCheck={false}
          autoFocus
          disabled={!sessionId}
          style={{
            flex: 1, background: "transparent", border: 0, outline: "none",
            color: "#fff", fontSize: 13.5,
            opacity: sessionId ? 1 : 0.55,
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--ch-text-4)", fontSize: 11, flexShrink: 0 }}>
          {["↑", "↓"].map((k) => (
            <kbd key={k} style={{ padding: "2px 5px", borderRadius: 4, background: "rgba(255,255,255,0.06)", border: "1px solid var(--line)", fontFamily: "inherit" }}>{k}</kbd>
          ))}
          <span style={{ marginLeft: 2 }}>historial</span>
        </div>
        <button
          onClick={sendInput}
          disabled={!sessionId || !input.trim()}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 8,
            background: sessionId && input.trim() ? "linear-gradient(180deg, #3b82f6, #2f6ed1)" : "rgba(255,255,255,0.04)",
            color: sessionId && input.trim() ? "#fff" : "var(--ch-text-4)",
            border: 0, fontWeight: 600, fontSize: 12.5,
            cursor: sessionId && input.trim() ? "pointer" : "not-allowed",
            boxShadow: sessionId && input.trim() ? "0 6px 18px rgba(59,130,246,0.35), inset 0 1px 0 rgba(255,255,255,0.18)" : "none",
            fontFamily: "inherit", flexShrink: 0, transition: "all 150ms",
          }}
        >
          <svg viewBox="0 0 24 24" style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          Ejecutar
        </button>
      </div>
    </div>
  )
}
