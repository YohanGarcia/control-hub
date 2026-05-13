"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createDeviceSchema, type CreateDeviceInput } from "@/lib/schemas"
import { devicesApi } from "@/lib/api/devices"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface DeviceFormProps {
  onSuccess?: (device: { id: number; name: string }) => void
  onCancel?: () => void
  className?: string
}

export function DeviceForm({ onSuccess, onCancel, className }: DeviceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateDeviceInput>({
    resolver: zodResolver(createDeviceSchema),
    defaultValues: {
      host_type: "ubuntu",
    },
  })

  const onSubmit = async (data: CreateDeviceInput) => {
    setIsSubmitting(true)
    setError("")
    try {
      const device = await devicesApi.create(data)
      onSuccess?.({ id: device.id, name: device.name })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn("space-y-4", className)}>
      <div>
        <Label htmlFor="name">Nombre del dispositivo</Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="servidor-prod-01"
          className="mt-1"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="host_type">Tipo de sistema</Label>
        <select
          id="host_type"
          {...register("host_type")}
          className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
        >
          <option value="ubuntu">Ubuntu / Linux</option>
          <option value="windows">Windows</option>
        </select>
        {errors.host_type && (
          <p className="mt-1 text-sm text-red-500">{errors.host_type.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="os_name">Sistema Operativo (opcional)</Label>
        <Input
          id="os_name"
          {...register("os_name")}
          placeholder="Ubuntu 22.04 LTS"
          className="mt-1"
        />
        {errors.os_name && (
          <p className="mt-1 text-sm text-red-500">{errors.os_name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="agent_key">Clave del agente</Label>
        <Input
          id="agent_key"
          {...register("agent_key")}
          placeholder="Ingresa la clave generada"
          className="mt-1"
        />
        {errors.agent_key && (
          <p className="mt-1 text-sm text-red-500">{errors.agent_key.message}</p>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creando..." : "Crear dispositivo"}
        </Button>
      </div>
    </form>
  )
}