"use client"

import { useEffect, useCallback, useState } from "react"
import wsClient from "@/lib/api/ws"
import { useAuthStore } from "@/stores/authStore"

interface UseWebSocketOptions {
  onMessage?: (message: unknown) => void
  onOpen?: () => void
  onClose?: () => void
  autoConnect?: boolean
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { accessToken } = useAuthStore()
  const [isConnected, setIsConnected] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  const connect = useCallback(
    (organizationId?: number) => {
      if (!accessToken) return

      wsClient.connect(accessToken, organizationId)
    },
    [accessToken]
  )

  const disconnect = useCallback(() => {
    wsClient.disconnect()
    setIsConnected(false)
  }, [])

  const sendMessage = useCallback((message: unknown) => {
    wsClient.send(message as Parameters<typeof wsClient.send>[0])
  }, [])

  useEffect(() => {
    const unsubMessage = wsClient.onMessage((message) => {
      options.onMessage?.(message)
    })

    const unsubOpen = wsClient.onOpen(() => {
      setIsConnected(true)
      setReconnectAttempts(0)
      options.onOpen?.()
    })

    const unsubClose = wsClient.onClose(() => {
      setIsConnected(false)
      setReconnectAttempts((prev) => prev + 1)
      options.onClose?.()
    })

    return () => {
      unsubMessage()
      unsubOpen()
      unsubClose()
      wsClient.disconnect()
    }
  }, [options.onMessage, options.onOpen, options.onClose])

  return {
    isConnected,
    reconnectAttempts,
    connect,
    disconnect,
    sendMessage,
  }
}