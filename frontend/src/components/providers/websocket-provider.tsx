"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import wsClient from "@/lib/api/ws"
import { useAuthStore } from "@/stores/authStore"

interface WebSocketMessage {
  type: string
  data?: unknown
  [key: string]: unknown
}

interface WebSocketContextValue {
  isConnected: boolean
  reconnectAttempts: number
  connect: (organizationId?: number) => Promise<void>
  disconnect: () => void
  sendMessage: (message: unknown) => void
  onMessage: (handler: (message: WebSocketMessage) => void) => () => void
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null)

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { accessToken, refreshSession } = useAuthStore()
  const [isConnected, setIsConnected] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [isConnecting, setIsConnecting] = useState(false)

  const isTokenExpired = (token: string) => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1])) as { exp?: number }
      if (!payload.exp) return true
      return payload.exp * 1000 <= Date.now() + 5000
    } catch {
      return true
    }
  }

  const connect = useCallback(
    async (organizationId?: number) => {
      if (!accessToken || isConnected || isConnecting || wsClient.isConnected) return

      setIsConnecting(true)

      let tokenToUse = accessToken
      if (isTokenExpired(tokenToUse)) {
        try {
          await refreshSession()
        } catch {
          setIsConnecting(false)
          return
        }
        tokenToUse = useAuthStore.getState().accessToken ?? ""
        if (!tokenToUse) {
          setIsConnecting(false)
          return
        }
      }

      wsClient.connect(tokenToUse, organizationId)
    },
    [accessToken, isConnected, isConnecting, refreshSession]
  )

  const disconnect = useCallback(() => {
    wsClient.disconnect()
    setIsConnected(false)
    setIsConnecting(false)
  }, [])

  const sendMessage = useCallback((message: unknown) => {
    wsClient.send(message as Parameters<typeof wsClient.send>[0])
  }, [])

  const onMessage = useCallback((handler: (message: WebSocketMessage) => void) => {
    return wsClient.onMessage(handler)
  }, [])

  useEffect(() => {
    const unsubOpen = wsClient.onOpen(() => {
      setIsConnected(true)
      setIsConnecting(false)
      setReconnectAttempts(0)
    })

    const unsubClose = wsClient.onClose(() => {
      setIsConnected(false)
      setIsConnecting(false)
      setReconnectAttempts((prev) => prev + 1)
    })

    return () => {
      unsubOpen()
      unsubClose()
    }
  }, [])

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        reconnectAttempts,
        connect,
        disconnect,
        sendMessage,
        onMessage,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error("useWebSocketContext must be used within WebSocketProvider")
  }
  return context
}

export function useWebSocket() {
  return useWebSocketContext()
}
