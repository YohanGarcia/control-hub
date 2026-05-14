import apiClient from "./client"

export type WsMessageType =
  | "client.terminal.start"
  | "client.terminal.input"
  | "client.terminal.stop"
  | "client.ai.start"
  | "client.ai.message"
  | "client.ai.stop"
  | "server.terminal.started"
  | "server.terminal.output"
  | "server.terminal.stopped"
  | "server.terminal.exit"
  | "server.ai.started"
  | "server.ai.delta"
  | "server.ai.done"
  | "server.ai.pty.ready"
  | "server.ai.error"
  | "server.ai.stopped"
  | "client.device.status.updated"
  | "client.device.metric.updated"
  | "client.action.run.updated"
  | "server.error"
  | "server.ack"

export interface WsMessage {
  type: WsMessageType
  [key: string]: unknown
}

type MessageHandler = (message: WsMessage) => void
type ConnectionHandler = () => void

const INITIAL_RECONNECT_DELAY = 1000
const MAX_RECONNECT_DELAY = 30000

class WsClient {
  private ws: WebSocket | null = null
  private url: string = ""
  private token: string = ""
  private organizationId: number | null = null
  private messageHandlers: Set<MessageHandler> = new Set()
  private openHandlers: Set<ConnectionHandler> = new Set()
  private closeHandlers: Set<ConnectionHandler> = new Set()
  private reconnectAttempt: number = 0
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  private shouldReconnect: boolean = true

  connect(token: string, organizationId?: number) {
    this.token = token
    this.organizationId = organizationId || null
    this.shouldReconnect = true
    this.reconnectAttempt = 0

    const baseWsUrl = apiClient.getWsUrl()
    let wsUrl = `${baseWsUrl}/ws/client?token=${token}`
    if (organizationId) {
      wsUrl += `&organization_id=${organizationId}`
    }

    this.url = wsUrl
    this.createConnection()
  }

  private createConnection() {
    if (this.ws) {
      this.ws.onopen = null
      this.ws.onmessage = null
      this.ws.onclose = null
      this.ws.onerror = null
      this.ws.close()
    }

    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {
      this.reconnectAttempt = 0
      this.openHandlers.forEach((handler) => handler())
    }

    this.ws.onmessage = (event) => {
      try {
        const message: WsMessage = JSON.parse(event.data)
        this.messageHandlers.forEach((handler) => handler(message))
      } catch {
        console.error("Failed to parse WebSocket message")
      }
    }

    this.ws.onclose = () => {
      this.closeHandlers.forEach((handler) => handler())
      if (this.shouldReconnect) {
        this.scheduleReconnect()
      }
    }

    this.ws.onerror = () => {
      // WebSocket errors don't provide useful details in the event
    }
  }

  private scheduleReconnect() {
    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempt),
      MAX_RECONNECT_DELAY
    )
    this.reconnectAttempt++

    this.reconnectTimeout = setTimeout(() => {
      this.createConnection()
    }, delay)
  }

  disconnect() {
    this.shouldReconnect = false
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  send(message: WsMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  sendTerminalStart(deviceId: number) {
    this.send({ type: "client.terminal.start", device_id: deviceId })
  }

  sendTerminalInput(data: string) {
    this.send({ type: "client.terminal.input", data })
  }

  sendTerminalStop() {
    this.send({ type: "client.terminal.stop" })
  }

  sendAIStart(deviceId: number) {
    this.send({ type: "client.ai.start", device_id: deviceId })
  }

  sendAIMessage(message: string) {
    this.send({ type: "client.ai.message", message })
  }

  sendAIStop() {
    this.send({ type: "client.ai.stop" })
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler)
    return () => this.messageHandlers.delete(handler)
  }

  onOpen(handler: ConnectionHandler) {
    this.openHandlers.add(handler)
    return () => this.openHandlers.delete(handler)
  }

  onClose(handler: ConnectionHandler) {
    this.closeHandlers.add(handler)
    return () => this.closeHandlers.delete(handler)
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

export const wsClient = new WsClient()
export default wsClient