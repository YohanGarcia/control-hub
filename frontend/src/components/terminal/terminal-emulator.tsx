"use client"

import { useEffect, useMemo, useRef, useState, useCallback, startTransition } from "react"
import { useWebSocketContext } from "@/components/providers/websocket-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Play, Square } from "lucide-react"

interface TerminalEmulatorProps {
  deviceId: number
  className?: string
}

export function TerminalEmulator({ deviceId, className }: TerminalEmulatorProps) {
  const sessionIdRef = useRef<string | null>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [buffer, setBuffer] = useState("")
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected")
  const [history, setHistory] = useState<string[]>([])
  const [historyCursor, setHistoryCursor] = useState(-1)
  const [usageMap, setUsageMap] = useState<Record<string, number>>({})
  const [showHistoryPanel, setShowHistoryPanel] = useState(true)

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
    } catch {
    }
  }, [historyKey, usageKey])

  useEffect(() => {
    try {
      localStorage.setItem(historyKey, JSON.stringify(history.slice(-100)))
    } catch {
    }
  }, [history, historyKey])

  useEffect(() => {
    try {
      localStorage.setItem(usageKey, JSON.stringify(usageMap))
    } catch {
    }
  }, [usageMap, usageKey])

  const suggestions = useMemo(() => {
    const base = ["ls -la", "pwd", "cd", "whoami", "ps", "cat", "clear", "opencode"]
    const q = input.trim().toLowerCase()
    if (!q) {
      return [...history]
        .sort((a, b) => (usageMap[b] ?? 0) - (usageMap[a] ?? 0))
        .slice(0, 6)
    }
    const fromHistory = history
      .filter((h) => h.toLowerCase().startsWith(q))
      .sort((a, b) => (usageMap[b] ?? 0) - (usageMap[a] ?? 0))
      .slice(0, 5)
    const fromBase = base.filter((c) => c.startsWith(q) && !fromHistory.includes(c)).slice(0, 5)
    return [...fromHistory, ...fromBase].slice(0, 6)
  }, [input, history, usageMap])

  const append = useCallback((text: string) => {
    setBuffer((prev) => `${prev}${text}`.slice(-40000))
  }, [])

  const handleTerminalMessage = useCallback((msg: unknown) => {
    const message = msg as { type: string; data?: { session_id?: string; chunk?: string; exit_code?: number } }

    if (message.type === "server.terminal.started") {
      const data = message.data as { session_id?: string }
      if (data?.session_id) {
        sessionIdRef.current = data.session_id
        setSessionId(data.session_id)
        setStatus("connected")
        append("[Session started]\n")
      }
      return
    }

    if (message.type === "client.terminal.output") {
      const data = message.data as { session_id?: string; chunk?: unknown }
      if (data?.session_id === sessionIdRef.current && typeof data.chunk === "string" && data.chunk) {
        append(data.chunk)
      }
      return
    }

    if (message.type === "client.terminal.exit") {
      const data = message.data as { session_id?: string; exit_code?: number }
      if (data?.session_id === sessionIdRef.current) {
        append(`\n[Session ended: exit_code=${data?.exit_code ?? 0}]\n`)
        sessionIdRef.current = null
        setSessionId(null)
        setStatus("disconnected")
      }
      return
    }
  }, [append])

  useEffect(() => {
    const unsubscribe = onMessage(handleTerminalMessage)
    return unsubscribe
  }, [onMessage, handleTerminalMessage])

  useEffect(() => {
    outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight, behavior: "smooth" })
  }, [buffer])

  useEffect(() => {
    if (isConnected && !sessionId) {
      startTransition(() => {
        setStatus("connecting")
      })
      sendMessage({ type: "client.terminal.start", data: { device_id: deviceId, shell: "default" } })
    }
  }, [isConnected, deviceId, sessionId, sendMessage])

  const sendInput = () => {
    if (!sessionId || !input.trim()) return
    const cmd = input.trim()
    if (cmd === "clear") {
      setBuffer("")
      setInput("")
      setHistoryCursor(-1)
      setUsageMap((prev) => ({ ...prev, [cmd]: (prev[cmd] ?? 0) + 1 }))
      return
    }
    append(`PS> ${cmd}\n`)
    setHistory((prev) => [...prev.filter((p) => p !== cmd), cmd].slice(-100))
    setUsageMap((prev) => ({ ...prev, [cmd]: (prev[cmd] ?? 0) + 1 }))
    setHistoryCursor(-1)
    sendMessage({
      type: "client.terminal.input",
      data: { session_id: sessionId, input: `${cmd}\n` },
    })
    setInput("")
  }

  const stopSession = () => {
    if (!sessionId) return
    sendMessage({ type: "client.terminal.stop", data: { session_id: sessionId } })
  }

  return (
    <div className={`h-full flex flex-col ${className ?? ""}`}>
      <div className="flex items-center justify-between border-b dark:border-gray-800 p-3">
        <div className="text-sm text-muted-foreground">
          {status === "connected" ? "Conectado" : status === "connecting" ? "Conectando..." : "Desconectado"}
        </div>
        <div className="flex items-center gap-2">
          {!isConnected && (
            <Button variant="outline" size="sm" onClick={() => connect()}>
              Conectar
            </Button>
          )}
          {sessionId && (
            <Button variant="outline" size="sm" onClick={stopSession} className="gap-2">
              <Square className="h-3 w-3" />
              Detener
            </Button>
          )}
        </div>
      </div>

      <div className="relative flex-1 min-h-0 bg-[#0B1120] flex">
        {showHistoryPanel && (
          <div className="w-64 border-r border-slate-800 p-2 overflow-y-auto">
            <div className="text-xs text-slate-400 px-2 pb-2">Historial reciente</div>
            {history.length === 0 ? (
              <div className="text-xs text-slate-500 px-2">Sin comandos</div>
            ) : (
              [...history]
                .reverse()
                .slice(0, 20)
                .map((h, idx) => (
                  <button
                    key={`${h}-${idx}`}
                    type="button"
                    onClick={() => setInput(h)}
                    className="w-full text-left px-2 py-1 text-xs text-slate-200 hover:bg-slate-800 rounded"
                    title={`Usado ${usageMap[h] ?? 0} veces`}
                  >
                    {h}
                  </button>
                ))
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div ref={outputRef} className="h-full overflow-y-auto p-4 font-mono text-sm text-slate-100 whitespace-pre-wrap">
            {buffer || "Presiona iniciar y ejecuta comandos..."}
          </div>
        </div>
        {status === "connecting" && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0B1120]/80">
            <div className="flex items-center gap-2 text-white">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Conectando...</span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t dark:border-gray-800 p-3 flex items-center gap-2">
        <Button variant="outline" onClick={() => setShowHistoryPanel((v) => !v)}>
          {showHistoryPanel ? "Ocultar historial" : "Mostrar historial"}
        </Button>
        <div className="relative flex-1">
            <Input
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setHistoryCursor(-1)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                sendInput()
                return
              }
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
                if (historyCursor <= 0) {
                  setHistoryCursor(-1)
                  setInput("")
                  return
                }
                const next = historyCursor - 1
                setHistoryCursor(next)
                setInput(history[history.length - 1 - next] ?? "")
              }
            }}
            placeholder="Escribe un comando..."
            disabled={!sessionId}
            />
          {sessionId && suggestions.length > 0 && (
            <div className="absolute bottom-11 left-0 right-0 rounded-md border bg-background shadow-md z-20">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setInput(s)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button onClick={sendInput} disabled={!sessionId || !input.trim()}>
          <Play className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
