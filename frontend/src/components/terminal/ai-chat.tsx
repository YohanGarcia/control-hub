"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Bot, Send, Square, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useWebSocketContext } from "@/components/providers/websocket-provider"
import { cn } from "@/lib/utils"

interface AIChatProps {
  deviceId: number
  className?: string
}

interface Message {
  role: "user" | "assistant"
  content: string
}

type AiMode = "pty" | "oneshot"
type AiProvider = "claude" | "opencode"

export function AIChat({ deviceId, className }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isActive, setIsActive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [mode, setMode] = useState<AiMode>(() => {
    try {
      if (typeof window === "undefined") return "pty"
      const raw = localStorage.getItem(`ai_prefs_${deviceId}`)
      if (!raw) return "pty"
      const parsed = JSON.parse(raw) as { mode?: AiMode }
      return parsed.mode === "oneshot" || parsed.mode === "pty" ? parsed.mode : "pty"
    } catch {
      return "pty"
    }
  })
  const [provider, setProvider] = useState<AiProvider>(() => {
    try {
      if (typeof window === "undefined") return "opencode"
      const raw = localStorage.getItem(`ai_prefs_${deviceId}`)
      if (!raw) return "opencode"
      const parsed = JSON.parse(raw) as { provider?: AiProvider }
      return parsed.provider === "claude" || parsed.provider === "opencode"
        ? parsed.provider
        : "opencode"
    } catch {
      return "opencode"
    }
  })
  const [statusText, setStatusText] = useState("Listo")
  const [autoSendEnter, setAutoSendEnter] = useState<boolean>(() => {
    try {
      if (typeof window === "undefined") return true
      const raw = localStorage.getItem(`ai_autosend_${deviceId}`)
      return raw == null ? true : raw === "true"
    } catch {
      return true
    }
  })
  const [customPrompt, setCustomPrompt] = useState("")
  const [savedPrompts, setSavedPrompts] = useState<string[]>(() => {
    try {
      if (typeof window === "undefined") return []
      const raw = localStorage.getItem(`ai_prompts_${deviceId}`)
      if (!raw) return []
      const parsed = JSON.parse(raw) as string[]
      return Array.isArray(parsed) ? parsed.slice(0, 10) : []
    } catch {
      return []
    }
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { isConnected, connect, sendMessage, onMessage } = useWebSocketContext()

  useEffect(() => {
    try {
      localStorage.setItem(`ai_prefs_${deviceId}`, JSON.stringify({ mode, provider }))
    } catch {
    }
  }, [deviceId, mode, provider])

  useEffect(() => {
    try {
      localStorage.setItem(`ai_autosend_${deviceId}`, String(autoSendEnter))
    } catch {
    }
  }, [autoSendEnter, deviceId])

  useEffect(() => {
    try {
      localStorage.setItem(`ai_prompts_${deviceId}`, JSON.stringify(savedPrompts.slice(0, 10)))
    } catch {
    }
  }, [savedPrompts, deviceId])

  const handleAIMessage = useCallback((msg: unknown) => {
    const message = msg as {
      type: string
      data?: { session_id?: string; chunk?: string; delta?: string; exit_code?: number }
    }

    if (message.type === "server.ai.started") {
      const sid = message.data?.session_id
      if (sid) {
        setSessionId(sid)
        setIsActive(true)
        setIsLoading(false)
        setStatusText(`Sesion activa (${mode.toUpperCase()} · ${provider})`)
      }
      return
    }

    if (message.type === "server.ai.delta") {
      if (message.data?.session_id !== sessionId) return
      const chunk = message.data?.chunk ?? message.data?.delta ?? ""
      if (!chunk) return
      setIsLoading(false)
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (last && last.role === "assistant") {
          return [...prev.slice(0, -1), { ...last, content: last.content + String(chunk) }]
        }
        return [...prev, { role: "assistant", content: String(chunk) }]
      })
      return
    }

    if (message.type === "server.ai.done" || message.type === "server.ai.stopped") {
      if (message.data?.session_id && message.data.session_id !== sessionId) return
      setIsLoading(false)
      if (mode === "oneshot") {
        setIsActive(false)
      }
      setStatusText("Respuesta completada")
      return
    }

    if (message.type === "server.ai.error") {
      if (message.data?.session_id && message.data.session_id !== sessionId) return
      setIsLoading(false)
      setIsActive(false)
      setStatusText("Error en la sesion")
    }
  }, [mode, provider, sessionId])

  useEffect(() => {
    const unsubscribe = onMessage(handleAIMessage)
    return unsubscribe
  }, [onMessage, handleAIMessage])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
  }, [messages])

  const startChat = () => {
    if (!isConnected) {
      connect()
      return
    }
    sendMessage({
      type: "client.ai.start",
      data: { device_id: deviceId, provider, mode },
    })
    setMessages([])
    setIsLoading(true)
    setStatusText("Iniciando sesion AI...")
  }

  const stopChat = () => {
    if (!sessionId) return
    sendMessage({ type: "client.ai.stop", data: { session_id: sessionId } })
    setIsActive(false)
    setIsLoading(false)
    setSessionId(null)
    setStatusText("Sesion detenida")
  }

  const sendMessageText = () => {
    if (!input.trim() || !isActive || !sessionId) return
    setMessages((prev) => [...prev, { role: "user", content: input }])
    sendMessage({ type: "client.ai.message", data: { session_id: sessionId, text: input } })
    setInput("")
    if (mode === "oneshot") {
      setIsLoading(true)
    }
    setStatusText("Procesando...")
  }

  const onComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape" && isActive) {
      e.preventDefault()
      stopChat()
      return
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      sendMessageText()
      return
    }
    if (e.key === "Enter" && !e.shiftKey && autoSendEnter) {
      e.preventDefault()
      sendMessageText()
      return
    }
    if (e.altKey && e.key === "ArrowUp") {
      e.preventDefault()
      if (savedPrompts.length > 0) {
        setInput(savedPrompts[0])
      }
    }
  }

  const savePrompt = () => {
    const p = customPrompt.trim()
    if (!p) return
    setSavedPrompts((prev) => [p, ...prev.filter((x) => x !== p)].slice(0, 10))
    setCustomPrompt("")
  }

  const removePrompt = (prompt: string) => {
    setSavedPrompts((prev) => prev.filter((p) => p !== prompt))
  }

  const movePrompt = (index: number, dir: -1 | 1) => {
    setSavedPrompts((prev) => {
      const next = [...prev]
      const to = index + dir
      if (to < 0 || to >= next.length) return prev
      const tmp = next[index]
      next[index] = next[to]
      next[to] = tmp
      return next
    })
  }

  return (
    <div className={cn("flex flex-col h-full bg-white dark:bg-[#0B1120]", className)}>
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <div className="rounded-full bg-blue-500/10 p-4 mb-4">
              <MessageCircle className="h-12 w-12 text-blue-500" />
            </div>
            <p className="text-lg font-medium">AI Assistant</p>
            <p className="text-sm mt-2 max-w-md">
              Asistente de IA para troubleshooting y asistencia en el dispositivo #{deviceId}
            </p>
            <Button
              onClick={startChat}
              disabled={!isConnected}
              className="mt-4 gap-2"
              size="lg"
            >
              <Bot className="h-4 w-4" />
              Iniciar Chat AI
            </Button>
            {!isConnected && (
              <div className="mt-2 flex items-center gap-2">
                <p className="text-xs text-red-500">Conecta al dispositivo primero</p>
                <Button size="sm" variant="outline" onClick={() => connect()}>
                  Conectar
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] p-3 rounded-2xl text-sm whitespace-pre-wrap",
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-md"
                      : "bg-gray-100 dark:bg-gray-800 rounded-bl-md"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1">
                    <span className="animate-bounce text-lg">.</span>
                    <span className="animate-bounce delay-75 text-lg">.</span>
                    <span className="animate-bounce delay-150 text-lg">.</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="border-t dark:border-gray-800 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">{statusText}</div>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full border px-2 py-0.5">{mode.toUpperCase()}</span>
            <span className="rounded-full border px-2 py-0.5">{provider}</span>
            {sessionId && <span className="rounded-full border px-2 py-0.5">sid:{sessionId.slice(0, 8)}</span>}
          </div>
        </div>
        <div className="mb-3 flex items-center justify-between rounded-md border px-3 py-2">
          <span className="text-xs text-muted-foreground">Auto-send con Enter</span>
          <button
            type="button"
            onClick={() => setAutoSendEnter((v) => !v)}
            className={`text-xs rounded px-2 py-1 border ${autoSendEnter ? "bg-primary text-primary-foreground" : ""}`}
          >
            {autoSendEnter ? "ON" : "OFF"}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
          <label className="text-xs text-muted-foreground">
            Modo
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as AiMode)}
              className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
              disabled={isActive}
            >
              <option value="pty">PTY</option>
              <option value="oneshot">Oneshot</option>
            </select>
          </label>
          <label className="text-xs text-muted-foreground">
            Proveedor
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as AiProvider)}
              className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
              disabled={isActive}
            >
              <option value="opencode">opencode</option>
              <option value="claude">claude</option>
            </select>
          </label>
        </div>
        {!isActive && messages.length === 0 && (
          <div className="mb-3 space-y-2">
            <div className="flex gap-2">
              <input
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Guardar prompt personalizado..."
                className="flex-1 rounded-md border bg-background px-2 py-1 text-sm"
              />
              <Button type="button" variant="outline" size="sm" onClick={savePrompt}>
                Guardar
              </Button>
            </div>
            {savedPrompts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {savedPrompts.map((p, idx) => (
                  <div key={`${p}-${idx}`} className="inline-flex items-center gap-1 rounded-full border px-2 py-1">
                    <button
                      type="button"
                      onClick={() => setInput(p)}
                      className="text-xs hover:underline"
                      title={p}
                    >
                      {p.length > 36 ? `${p.slice(0, 36)}...` : p}
                    </button>
                    <button
                      type="button"
                      className="text-[10px] px-1 rounded hover:bg-muted"
                      onClick={() => movePrompt(idx, -1)}
                      title="Mover arriba"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="text-[10px] px-1 rounded hover:bg-muted"
                      onClick={() => movePrompt(idx, 1)}
                      title="Mover abajo"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="text-[10px] px-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                      onClick={() => removePrompt(p)}
                      title="Eliminar"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setInput("Diagnostica el estado del sistema y sugiere los primeros comandos")}
            >
              Prompt diagnostico
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setInput("Revisa errores recientes y dame pasos de correccion")}
            >
              Prompt errores
            </Button>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          {!isActive ? (
            <Button onClick={startChat} disabled={!isConnected} className="gap-2">
              <Bot className="h-4 w-4" />
              Iniciar Chat AI
            </Button>
          ) : (
            <Button variant="destructive" onClick={stopChat} className="gap-2">
              <Square className="h-4 w-4" />
              Detener
            </Button>
          )}
        </div>

        {isActive && (
          <div className="flex gap-2 mt-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onComposerKeyDown}
              placeholder="Escribe tu mensaje... (Enter/Ctrl+Enter enviar, Shift+Enter nueva línea, Esc detener)"
              className="flex-1 min-h-[44px] max-h-[120px] resize-none"
              rows={1}
            />
            <Button onClick={sendMessageText} disabled={!input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
