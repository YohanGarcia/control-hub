"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { devicesApi, type Device, type DeviceStatus, type DeviceMetric, type DeviceAction, type ActionRun } from "@/lib/api/devices"

export function useDevices() {
  return useQuery({
    queryKey: ["devices"],
    queryFn: devicesApi.list,
    refetchInterval: 30000,
  })
}

export function useDevice(id: number) {
  return useQuery({
    queryKey: ["devices", id],
    queryFn: () => devicesApi.get(id),
    enabled: !!id,
  })
}

export function useDeviceStatus(id: number) {
  return useQuery({
    queryKey: ["devices", id, "status"],
    queryFn: () => devicesApi.getStatus(id),
    enabled: !!id,
    refetchInterval: 10000,
  })
}

export function useDeviceMetrics(id: number, params?: { offset?: number; limit?: number; from_ts?: string; to_ts?: string }) {
  return useQuery({
    queryKey: ["devices", id, "metrics", params],
    queryFn: () => devicesApi.getMetrics(id, params),
    enabled: !!id,
    refetchInterval: 15000,
  })
}

export function useDeviceActions(id: number) {
  return useQuery({
    queryKey: ["devices", id, "actions"],
    queryFn: () => devicesApi.getActions(id),
    enabled: !!id,
  })
}

export function useDeviceActionHistory(id: number) {
  return useQuery({
    queryKey: ["devices", id, "actions", "history"],
    queryFn: () => devicesApi.getActionHistory(id),
    enabled: !!id,
  })
}

export function useRunAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ deviceId, actionId, params }: { deviceId: number; actionId: number; params?: Record<string, unknown> }) =>
      devicesApi.runAction(deviceId, actionId, { params }),
    onSuccess: (_, { deviceId }) => {
      queryClient.invalidateQueries({ queryKey: ["devices", deviceId, "actions", "history"] })
    },
  })
}

export function useActionRun(runId: number) {
  return useQuery({
    queryKey: ["runs", runId],
    queryFn: () => devicesApi.getRun(runId),
    enabled: !!runId,
    refetchInterval: 2000,
  })
}

export function useCreateDevice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: devicesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] })
    },
  })
}

export function useUpdateDevice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Device> }) => devicesApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["devices", id] })
      queryClient.invalidateQueries({ queryKey: ["devices"] })
    },
  })
}