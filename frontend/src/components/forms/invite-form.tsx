"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createInviteSchema, type CreateInviteInput } from "@/lib/schemas"
import { organizationsApi } from "@/lib/api/organizations"
import { useUIStore } from "@/stores/uiStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface InviteFormProps {
  organizationId: number
  onSuccess?: () => void
  onCancel?: () => void
  className?: string
}

export function InviteForm({ organizationId, onSuccess, onCancel, className }: InviteFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [inviteLink, setInviteLink] = useState("")
  const { currentOrganizationId } = useUIStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateInviteInput>({
    resolver: zodResolver(createInviteSchema),
    defaultValues: {
      role: "viewer",
    },
  })

  const onSubmit = async (data: CreateInviteInput) => {
    setIsSubmitting(true)
    setError("")
    try {
      const invite = await organizationsApi.createInvite(organizationId, data)
      const baseUrl = window.location.origin
      setInviteLink(`${baseUrl}/invites/accept?token=${invite.token}`)
      onSuccess?.()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink)
  }

  if (inviteLink) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-sm text-green-800 dark:text-green-200 font-medium">
            ¡Invitación creada!
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            Comparte este enlace con el usuario. El enlace expire en 24 horas.
          </p>
        </div>
        <div>
          <Label>Enlace de invitación</Label>
          <div className="flex gap-2 mt-1">
            <Input
              value={inviteLink}
              readOnly
              className="flex-1 text-sm"
            />
            <Button onClick={copyToClipboard} variant="outline">
              Copiar
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setInviteLink("")} variant="outline">
            Crear otra
          </Button>
          {onCancel && (
            <Button onClick={onCancel}>
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
        <Label htmlFor="role">Rol del usuario</Label>
        <select
          id="role"
          {...register("role")}
          className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
        >
          <option value="viewer">Viewer - Solo lectura</option>
          <option value="operator">Operator - Puede ejecutar acciones</option>
          <option value="admin">Admin - Gestión completa</option>
        </select>
        {errors.role && (
          <p className="mt-1 text-sm text-red-500">{errors.role.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="expires_in_seconds">Expira en (segundos)</Label>
        <Input
          id="expires_in_seconds"
          type="number"
          {...register("expires_in_seconds")}
          placeholder="86400 (24 horas)"
          className="mt-1"
        />
        {errors.expires_in_seconds && (
          <p className="mt-1 text-sm text-red-500">{errors.expires_in_seconds.message}</p>
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
          {isSubmitting ? "Creando..." : "Crear invitación"}
        </Button>
      </div>
    </form>
  )
}