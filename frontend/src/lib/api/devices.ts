import apiClient from "./client"

export interface Device {
  id: number
  name: string
  host_type: string
  os_name: string | null
  agent_version: string | null
  is_online: boolean
  last_seen_at: string | null
}

export interface DeviceStatus {
  device: Device
  latest_metric: DeviceMetric | null
}

export interface DeviceMetric {
  cpu_percent: number
  ram_percent: number
  disk_percent: number
  cpu_min: number | null
  cpu_max: number | null
  ram_min: number | null
  ram_max: number | null
  disk_min: number | null
  disk_max: number | null
  sample_count: number
  window_seconds: number
  net_bytes_recv: number | null
  net_bytes_sent: number | null
  cpu_per_core: number[] | null
  load_avg_1: number | null
  load_avg_5: number | null
  load_avg_15: number | null
  temps: Array<{ label: string; value: number; max?: number }> | null
  disk_mounts: Array<{ path: string; used_gb: number; total_gb: number; percent: number }> | null
  uptime_seconds: number
  created_at: string
}

export interface CreateDeviceRequest {
  name: string
  host_type: "windows" | "ubuntu"
  os_name?: string
  agent_version?: string
  agent_key: string
}

export interface UpdateDeviceRequest {
  name?: string
  is_online?: boolean
}

export interface DeviceAction {
  id: number
  slug: string
  name: string
  host_type: string
  timeout_seconds: number
  max_output_chars: number
  is_active: boolean
}

export interface ActionRun {
  id: number
  request_id: string
  device_id: number
  action_id: number
  status: "queued" | "running" | "succeeded" | "failed" | "timeout"
  exit_code: number | null
  output_text: string | null
  error_text: string | null
  started_at: string | null
  finished_at: string | null
  created_at: string
}

export interface RunActionRequest {
  params?: Record<string, unknown>
}

export interface AuditEvent {
  id: number
  event_type: string
  actor_user_id: number
  source_ip: string | null
  target_type: string | null
  target_id: string | null
  details: string | null
  created_at: string
}

export const devicesApi = {
  list: () => apiClient.get<Device[]>("/devices"),

  get: (id: number) =>
    apiClient.get<DeviceStatus>(`/devices/${id}/status`).then(r => r.device),

  create: (data: CreateDeviceRequest) =>
    apiClient.post<Device>("/devices", data),

  update: (id: number, data: UpdateDeviceRequest) =>
    apiClient.patch<Device>(`/devices/${id}`, data),

  getStatus: (id: number) =>
    apiClient.get<DeviceStatus>(`/devices/${id}/status`),

  getMetrics: (id: number, params?: { offset?: number; limit?: number; from_ts?: string; to_ts?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.offset) searchParams.set("offset", String(params.offset))
    if (params?.limit) searchParams.set("limit", String(params.limit))
    if (params?.from_ts) searchParams.set("from_ts", params.from_ts)
    if (params?.to_ts) searchParams.set("to_ts", params.to_ts)
    const query = searchParams.toString()
    return apiClient.get<DeviceMetric[]>(`/devices/${id}/metrics${query ? `?${query}` : ""}`)
  },

  getActions: (id: number) =>
    apiClient.get<DeviceAction[]>(`/devices/${id}/actions`),

  runAction: (deviceId: number, actionId: number, data?: RunActionRequest) =>
    apiClient.post<ActionRun>(`/devices/${deviceId}/actions/${actionId}/run`, data || {}),

  getActionHistory: (id: number) =>
    apiClient.get<ActionRun[]>(`/devices/${id}/actions/history`),

  getRun: (runId: number) =>
    apiClient.get<ActionRun>(`/runs/${runId}`),
}

export const auditApi = {
  getEvents: (params?: { offset?: number; limit?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.offset) searchParams.set("offset", String(params.offset))
    if (params?.limit) searchParams.set("limit", String(params.limit))
    const query = searchParams.toString()
    return apiClient.get<AuditEvent[]>(`/audit/events${query ? `?${query}` : ""}`)
  },
}
