"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useWebSocketContext } from "@/components/providers/websocket-provider"

interface AIChatProps {
  deviceId: number
  className?: string
}

interface Message {
  id: number
  role: "user" | "assistant"
  content: string
}

type AiMode = "pty" | "oneshot"
type AiProvider = "claude" | "opencode"

let _msgId = 0
const nextId = () => ++_msgId

/* ── Icons ── */
const ICON_SEND = (
  <svg viewBox="0 0 24 24" style={{ width: 15, height: 15 }} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
)
const ICON_STOP = (
  <svg viewBox="0 0 24 24" style={{ width: 13, height: 13 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
  </svg>
)
const ICON_BOT = (
  <svg viewBox="0 0 24 24" style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2"/>
    <path d="M12 11V7"/><circle cx="12" cy="5" r="2"/>
    <path d="M8 15h.01M16 15h.01"/>
  </svg>
)
const ICON_USER = (
  <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
)
const ICON_GEAR = (
  <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
)

/* ── Typing indicator ── */
function TypingDots() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: "50%", display: "inline-block",
          background: "var(--ch-text-3)",
          animation: `aiDot 1.2s ${i * 0.2}s infinite ease-in-out`,
        }} />
      ))}
      <style>{`@keyframes aiDot{0%,80%,100%{transform:scale(.8);opacity:.4}40%{transform:scale(1.2);opacity:1}}`}</style>
    </span>
  )
}

/* ── Settings popover ── */
function Settings({
  mode, setMode, provider, setProvider, disabled,
}: {
  mode: AiMode; setMode: (v: AiMode) => void
  provider: AiProvider; setProvider: (v: AiProvider) => void
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Configuración"
        style={{
          display: "grid", placeItems: "center",
          width: 32, height: 32, borderRadius: 8,
          background: open ? "rgba(255,255,255,0.07)" : "transparent",
          border: "1px solid " + (open ? "var(--line-strong)" : "transparent"),
          color: "var(--ch-text-3)", cursor: "pointer",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--ch-text)" }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--ch-text-3)" }}
      >
        {ICON_GEAR}
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 10 }} onClick={() => setOpen(false)} />
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 20,
            width: 240,
            background: "linear-gradient(180deg, rgba(20,27,49,0.98), rgba(13,18,34,0.98))",
            border: "1px solid var(--line)", borderRadius: 12,
            boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
            padding: 14,
          }}>
            <div style={{ fontSize: 11, color: "var(--ch-text-3)", fontWeight: 600, letterSpacing: 1, marginBottom: 12 }}>CONFIGURACIÓN</div>
            {[
              { label: "Modo", value: mode, options: [{ v: "pty" as AiMode, l: "PTY (interactivo)" }, { v: "oneshot" as AiMode, l: "Oneshot" }], set: setMode },
              { label: "Proveedor", value: provider, options: [{ v: "opencode" as AiProvider, l: "opencode" }, { v: "claude" as AiProvider, l: "claude" }], set: setProvider },
            ].map((f) => (
              <div key={f.label} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "var(--ch-text-4)", marginBottom: 6 }}>{f.label}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {f.options.map((o) => (
                    <button
                      key={o.v}
                      onClick={() => { if (!disabled) (f.set as (v: string) => void)(o.v) }}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "7px 10px", borderRadius: 8, fontSize: 12.5,
                        background: f.value === o.v ? "rgba(139,92,246,0.14)" : "rgba(255,255,255,0.03)",
                        border: "1px solid " + (f.value === o.v ? "rgba(139,92,246,0.4)" : "var(--line)"),
                        color: f.value === o.v ? "var(--ch-violet-2)" : "var(--ch-text-2)",
                        cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
                        opacity: disabled ? 0.5 : 1, textAlign: "left",
                      }}
                    >
                      <span style={{
                        width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
                        border: "2px solid " + (f.value === o.v ? "var(--ch-violet-2)" : "var(--line)"),
                        background: f.value === o.v ? "var(--ch-violet-2)" : "transparent",
                        display: "inline-block",
                      }} />
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ── Quick prompts ── */
const QUICK_PROMPTS = [
  "Diagnostica el estado del sistema",
  "Revisa errores en los logs",
  "Muestra el uso de memoria y CPU",
  "Lista los procesos con más consumo",
]

export function AIChat({ deviceId }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isActive, setIsActive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [autoEnter, setAutoEnter] = useState(true)

  const [mode, setMode] = useState<AiMode>(() => {
    try { return (JSON.parse(localStorage.getItem(`ai_prefs_${deviceId}`) ?? "{}") as { mode?: AiMode }).mode ?? "pty" } catch { return "pty" }
  })
  const [provider, setProvider] = useState<AiProvider>(() => {
    try { return (JSON.parse(localStorage.getItem(`ai_prefs_${deviceId}`) ?? "{}") as { provider?: AiProvider }).provider ?? "opencode" } catch { return "opencode" }
  })

  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { isConnected, connect, sendMessage, onMessage } = useWebSocketContext()

  useEffect(() => {
    try { localStorage.setItem(`ai_prefs_${deviceId}`, JSON.stringify({ mode, provider })) } catch {}
  }, [deviceId, mode, provider])

  const handleMsg = useCallback((msg: unknown) => {
    const m = msg as { type: string; data?: Record<string, unknown> }
    if (m.type === "server.ai.started") {
      const sid = m.data?.session_id as string | undefined
      if (sid) { setSessionId(sid); setIsActive(true); setIsLoading(false) }
    } else if (m.type === "server.ai.delta") {
      if (m.data?.session_id !== sessionId) return
      const chunk = ((m.data?.chunk ?? m.data?.delta) as string) || ""
      if (!chunk) return
      setIsLoading(false)
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (last?.role === "assistant") return [...prev.slice(0, -1), { ...last, content: last.content + chunk }]
        return [...prev, { id: nextId(), role: "assistant", content: chunk }]
      })
    } else if (m.type === "server.ai.done" || m.type === "server.ai.stopped") {
      setIsLoading(false)
      if (mode === "oneshot") setIsActive(false)
    } else if (m.type === "server.ai.error") {
      setIsLoading(false); setIsActive(false)
      setMessages((prev) => [...prev, { id: nextId(), role: "assistant", content: "⚠️ Error al procesar la respuesta." }])
    }
  }, [mode, sessionId])

  useEffect(() => onMessage(handleMsg), [onMessage, handleMsg])

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, isLoading])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`
  }, [input])

  const startChat = () => {
    if (!isConnected) { connect(); return }
    sendMessage({ type: "client.ai.start", data: { device_id: deviceId, provider, mode } })
    setMessages([])
    setIsLoading(true)
  }

  const stopChat = () => {
    if (!sessionId) return
    sendMessage({ type: "client.ai.stop", data: { session_id: sessionId } })
    setIsActive(false); setIsLoading(false); setSessionId(null)
  }

  const sendMsg = (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || !isActive || !sessionId) return
    setMessages((prev) => [...prev, { id: nextId(), role: "user", content }])
    sendMessage({ type: "client.ai.message", data: { session_id: sessionId, text: content } })
    setInput("")
    if (mode === "oneshot") setIsLoading(true)
  }

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape" && isActive) { e.preventDefault(); stopChat(); return }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sendMsg(); return }
    if (e.key === "Enter" && !e.shiftKey && autoEnter) { e.preventDefault(); sendMsg() }
  }

  const isEmpty = messages.length === 0 && !isLoading

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "rgba(7,10,20,0.88)" }}>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 16px", borderBottom: "1px solid var(--line)",
        background: "rgba(15,20,36,0.7)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(59,130,246,0.2))",
            border: "1px solid rgba(139,92,246,0.35)",
            display: "grid", placeItems: "center", color: "var(--ch-violet-2)",
          }}>
            {ICON_BOT}
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "#fff", lineHeight: 1.1 }}>AI Assistant</div>
            <div style={{ fontSize: 11, color: "var(--ch-text-3)", display: "flex", alignItems: "center", gap: 5, marginTop: 1 }}>
              {isActive
                ? <><span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--ch-green)", display: "inline-block", boxShadow: "0 0 4px var(--ch-green)" }} /> Sesión activa</>
                : "Inactivo"
              }
              <span style={{ color: "var(--ch-text-4)" }}>·</span>
              <span>{mode}</span>
              <span style={{ color: "var(--ch-text-4)" }}>·</span>
              <span>{provider}</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => setAutoEnter(v => !v)}
            title="Auto-envío con Enter"
            style={{
              padding: "4px 10px", borderRadius: 7, fontSize: 11, fontFamily: "inherit", cursor: "pointer",
              background: autoEnter ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.04)",
              border: "1px solid " + (autoEnter ? "rgba(59,130,246,0.35)" : "var(--line)"),
              color: autoEnter ? "var(--ch-blue-2)" : "var(--ch-text-3)",
            }}
          >
            Enter {autoEnter ? "ON" : "OFF"}
          </button>
          {isActive && (
            <button onClick={stopChat} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "5px 12px", borderRadius: 7,
              background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.3)",
              color: "var(--ch-red)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>
              {ICON_STOP} Detener
            </button>
          )}
          <Settings mode={mode} setMode={setMode} provider={provider} setProvider={setProvider} disabled={isActive} />
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="ch-scroll" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {isEmpty ? (
          /* Empty state */
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", gap: 24 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(59,130,246,0.15))",
              border: "1px solid rgba(139,92,246,0.3)",
              display: "grid", placeItems: "center",
              boxShadow: "0 0 40px rgba(139,92,246,0.15)",
            }}>
              <svg viewBox="0 0 24 24" style={{ width: 32, height: 32, color: "var(--ch-violet-2)" }} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="10" rx="2"/>
                <path d="M12 11V7"/><circle cx="12" cy="5" r="2"/>
                <path d="M8 15h.01M16 15h.01"/>
              </svg>
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>AI Assistant</div>
              <div style={{ fontSize: 13.5, color: "var(--ch-text-3)", lineHeight: 1.6, maxWidth: 340 }}>
                Asistente inteligente para troubleshooting, diagnóstico y gestión del dispositivo.
              </div>
            </div>

            {/* Quick prompts grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: "100%", maxWidth: 440 }}>
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => { if (isActive) { sendMsg(p) } else { setInput(p) } }}
                  style={{
                    padding: "11px 14px", borderRadius: 10, fontSize: 12.5, lineHeight: 1.4,
                    background: "rgba(255,255,255,0.03)", border: "1px solid var(--line)",
                    color: "var(--ch-text-2)", cursor: "pointer", fontFamily: "inherit",
                    textAlign: "left", transition: "all 150ms",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(139,92,246,0.10)"
                    e.currentTarget.style.borderColor = "rgba(139,92,246,0.35)"
                    e.currentTarget.style.color = "#fff"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)"
                    e.currentTarget.style.borderColor = "var(--line)"
                    e.currentTarget.style.color = "var(--ch-text-2)"
                  }}
                >
                  {p}
                </button>
              ))}
            </div>

            {!isConnected && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 10, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.22)", fontSize: 12.5, color: "var(--ch-red)" }}>
                WebSocket desconectado
                <button onClick={() => connect()} style={{ background: "none", border: "none", color: "var(--ch-blue-2)", cursor: "pointer", fontSize: 12.5, fontFamily: "inherit", textDecoration: "underline" }}>
                  Conectar
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Message list */
          <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{ display: "flex", gap: 12, flexDirection: msg.role === "user" ? "row-reverse" : "row", alignItems: "flex-start" }}>
                {/* Avatar */}
                <div style={{
                  width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                  display: "grid", placeItems: "center",
                  background: msg.role === "assistant"
                    ? "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(59,130,246,0.15))"
                    : "linear-gradient(135deg, rgba(59,130,246,0.25), rgba(99,102,241,0.15))",
                  border: "1px solid " + (msg.role === "assistant" ? "rgba(139,92,246,0.3)" : "rgba(59,130,246,0.3)"),
                  color: msg.role === "assistant" ? "var(--ch-violet-2)" : "var(--ch-blue-2)",
                }}>
                  {msg.role === "assistant" ? ICON_BOT : ICON_USER}
                </div>

                {/* Bubble */}
                <div style={{
                  maxWidth: "82%",
                  padding: "11px 16px",
                  borderRadius: msg.role === "user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
                  fontSize: 13.5, lineHeight: 1.65, whiteSpace: "pre-wrap",
                  background: msg.role === "user"
                    ? "linear-gradient(180deg, rgba(59,130,246,0.22), rgba(59,130,246,0.12))"
                    : "rgba(255,255,255,0.04)",
                  border: "1px solid " + (msg.role === "user" ? "rgba(59,130,246,0.38)" : "rgba(255,255,255,0.07)"),
                  color: "#e8eaf0",
                }}>
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                  display: "grid", placeItems: "center",
                  background: "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(59,130,246,0.15))",
                  border: "1px solid rgba(139,92,246,0.3)",
                  color: "var(--ch-violet-2)",
                }}>
                  {ICON_BOT}
                </div>
                <div style={{
                  padding: "12px 16px", borderRadius: "4px 14px 14px 14px",
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                }}>
                  <TypingDots />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div style={{
        borderTop: "1px solid var(--line)",
        background: "rgba(10,14,26,0.8)",
        padding: "12px 16px 16px",
        flexShrink: 0,
      }}>
        {isActive ? (
          <div style={{
            display: "flex", gap: 10, alignItems: "flex-end",
            background: "linear-gradient(180deg, rgba(20,27,49,0.95), rgba(13,18,34,0.95))",
            border: "1px solid rgba(139,92,246,0.25)",
            borderRadius: 14,
            padding: "10px 12px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4), inset 0 0 20px rgba(139,92,246,0.05)",
          }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder={autoEnter ? "Escribe tu mensaje… (Enter para enviar, Shift+Enter nueva línea)" : "Escribe tu mensaje… (Ctrl+Enter para enviar)"}
              rows={1}
              style={{
                flex: 1, background: "transparent", border: 0, outline: "none",
                color: "#fff", fontSize: 13.5, lineHeight: 1.55,
                resize: "none", fontFamily: "inherit",
                minHeight: 22, maxHeight: 140,
              }}
            />
            <button
              onClick={() => sendMsg()}
              disabled={!input.trim()}
              style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                display: "grid", placeItems: "center",
                background: input.trim()
                  ? "linear-gradient(180deg, rgba(139,92,246,0.9), rgba(109,62,216,0.9))"
                  : "rgba(255,255,255,0.05)",
                border: "1px solid " + (input.trim() ? "rgba(139,92,246,0.5)" : "var(--line)"),
                color: input.trim() ? "#fff" : "var(--ch-text-4)",
                cursor: input.trim() ? "pointer" : "not-allowed",
                boxShadow: input.trim() ? "0 4px 14px rgba(139,92,246,0.4)" : "none",
                transition: "all 150ms",
              }}
            >
              {ICON_SEND}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {input && (
              <div style={{
                flex: 1,
                display: "flex", alignItems: "center", gap: 10,
                background: "rgba(255,255,255,0.03)", border: "1px solid var(--line)",
                borderRadius: 10, padding: "8px 12px",
              }}>
                <span style={{ flex: 1, fontSize: 13, color: "var(--ch-text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{input}</span>
                <button onClick={() => setInput("")} style={{ background: "none", border: "none", color: "var(--ch-text-4)", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
              </div>
            )}
            <button
              onClick={startChat}
              disabled={!isConnected}
              style={{
                display: "inline-flex", alignItems: "center", gap: 9,
                padding: "10px 20px", borderRadius: 12, fontSize: 13.5, fontWeight: 600,
                background: isConnected
                  ? "linear-gradient(180deg, rgba(139,92,246,0.85), rgba(109,62,216,0.85))"
                  : "rgba(255,255,255,0.06)",
                border: "1px solid " + (isConnected ? "rgba(139,92,246,0.5)" : "var(--line)"),
                color: isConnected ? "#fff" : "var(--ch-text-4)",
                cursor: isConnected ? "pointer" : "not-allowed",
                boxShadow: isConnected ? "0 6px 20px rgba(139,92,246,0.35), inset 0 1px 0 rgba(255,255,255,0.15)" : "none",
                fontFamily: "inherit", whiteSpace: "nowrap",
              }}
            >
              {ICON_BOT}
              {input ? "Iniciar con este prompt" : "Iniciar AI"}
            </button>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6, fontSize: 11, color: "var(--ch-text-4)" }}>
          {isActive
            ? <>{autoEnter ? "Enter · enviar" : "Ctrl+Enter · enviar"} &nbsp;·&nbsp; Shift+Enter · nueva línea &nbsp;·&nbsp; Esc · detener</>
            : <>{isConnected ? "WebSocket conectado" : "WebSocket desconectado · haz clic en Conectar"}</>
          }
        </div>
      </div>
    </div>
  )
}
