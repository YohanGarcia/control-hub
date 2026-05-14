"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Check, Copy } from "lucide-react"
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

const createDeviceFormSchema = createDeviceSchema.omit({ agent_key: true, agent_version: true })
type CreateDeviceFormInput = z.infer<typeof createDeviceFormSchema>

export function DeviceForm({ onSuccess, onCancel, className }: DeviceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const [showSteps, setShowSteps] = useState(false)
  const [createdDevice, setCreatedDevice] = useState<{ id: number; name: string } | null>(null)
  const [generatedAgentKey, setGeneratedAgentKey] = useState<string | null>(null)
  const [selectedHostType, setSelectedHostType] = useState<"windows" | "ubuntu">("ubuntu")

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

  const getServerUrl = () => {
    try {
      return new URL(apiBaseUrl).origin
    } catch {
      return "http://127.0.0.1:8001"
    }
  }

  const generateAgentKey = () => {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
    return `controlhub-agent-${token}`
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateDeviceFormInput>({
    resolver: zodResolver(createDeviceFormSchema),
    defaultValues: {
      host_type: "ubuntu",
    },
  })

  const hostTypeRegister = register("host_type")

  const onSubmit = async (data: CreateDeviceFormInput) => {
    setIsSubmitting(true)
    setError("")
    try {
      const agentKey = generateAgentKey()
      const device = await devicesApi.create({
        ...(data as Omit<CreateDeviceInput, "agent_key">),
        agent_version: undefined,
        agent_key: agentKey,
      })
      setGeneratedAgentKey(agentKey)
      setCreatedDevice({ id: device.id, name: device.name })
      setSelectedHostType(data.host_type)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const buildConfigureCommand = () => {
    if (!createdDevice || !generatedAgentKey) {
      return ""
    }
    const serverUrl = getServerUrl()
    if (selectedHostType === "windows") {
      return `.\\controlhub-agent.ps1 configure -Server "${serverUrl}" -DeviceId ${createdDevice.id} -AgentKey "${generatedAgentKey}"`
    }
    return `./controlhub-agent.sh configure --server ${serverUrl} --device-id ${createdDevice.id} --agent-key '${generatedAgentKey}'`
  }

  const handleCopyCommand = async () => {
    const command = buildConfigureCommand()
    if (!command) {
      return
    }
    await navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (createdDevice && generatedAgentKey) {
    const command = buildConfigureCommand()
    return (
      <div className={cn("space-y-4", className)}>
        <p className="text-sm text-muted-foreground">Dispositivo creado correctamente: <span className="font-medium text-foreground">{createdDevice.name}</span> (ID {createdDevice.id})</p>

        <div>
          <Label htmlFor="configure_command">Comando de configuracion del agente</Label>
          <div className="mt-1 flex gap-2">
            <Input id="configure_command" value={command} readOnly className="font-mono text-xs" />
            <Button type="button" variant="outline" onClick={handleCopyCommand} className="gap-2" aria-label="Copiar comando">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Copia y ejecuta este comando en la maquina del dispositivo.</p>
          {copied && (
            <p className="mt-2 inline-flex rounded-md bg-emerald-500/10 px-2 py-1 text-xs text-emerald-600">
              Comando copiado al portapapeles.
            </p>
          )}
        </div>

        <div className="rounded-md border bg-muted/30 p-3">
          <button
            type="button"
            onClick={() => setShowSteps((value) => !value)}
            className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            {showSteps ? "Ocultar pasos para iniciar el agente" : "Ver pasos para iniciar el agente"}
          </button>
          {showSteps && (
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
              <li>Descarga el launcher del agente en la maquina del dispositivo.</li>
              <li>Ejecuta el comando configurado que acabas de copiar.</li>
              <li>Inicia el agente con el comando <span className="font-mono">start</span>.</li>
            </ol>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() => {
              onSuccess?.({ id: createdDevice.id, name: createdDevice.name })
            }}
          >
            Listo
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cerrar
            </Button>
          )}
        </div>
      </div>
    )
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
          {...hostTypeRegister}
          onChange={(event) => {
            hostTypeRegister.onChange(event)
            setSelectedHostType(event.target.value as "windows" | "ubuntu")
          }}
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
