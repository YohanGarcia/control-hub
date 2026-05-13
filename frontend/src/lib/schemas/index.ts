import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  totp_code: z.string().length(6, "El código TOTP debe tener 6 dígitos").optional(),
})

export const registerSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(12, "La contraseña debe tener al menos 12 caracteres"),
  full_name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").optional(),
})

export const changePasswordSchema = z.object({
  current_password: z.string().min(8),
  new_password: z.string().min(12, "La nueva contraseña debe tener al menos 12 caracteres"),
})

export const createOrganizationSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(120),
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones"),
})

export const createDeviceSchema = z.object({
  name: z.string().min(2).max(120),
  host_type: z.enum(["windows", "ubuntu"]),
  os_name: z.string().optional(),
  agent_version: z.string().optional(),
  agent_key: z.string().min(24).max(256),
})

export const createInviteSchema = z.object({
  role: z.enum(["admin", "operator", "viewer"]),
  expires_in_seconds: z.number().optional(),
})

export const createEnrollmentTokenSchema = z.object({
  expires_in_seconds: z.number().optional().default(600),
  max_uses: z.number().optional().default(1),
})

export const runActionSchema = z.object({
  params: z.record(z.string(), z.unknown()).optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>
export type CreateDeviceInput = z.infer<typeof createDeviceSchema>
export type CreateInviteInput = z.infer<typeof createInviteSchema>
export type CreateEnrollmentTokenInput = z.infer<typeof createEnrollmentTokenSchema>
export type RunActionInput = z.infer<typeof runActionSchema>