"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { loginSchema, type LoginInput } from "@/lib/schemas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuthStore } from "@/stores/authStore"
import { useRouter } from "next/navigation"

export function LoginForm() {
  const router = useRouter()
  const { login, isLoading, error } = useAuthStore()
  const [showTotp, setShowTotp] = useState(false)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      totp_code: undefined,
    },
  })

  const onSubmit = async (data: LoginInput) => {
    try {
      await login(data.email, data.password, data.totp_code)
      router.push("/")
    } catch {
      // Error handled by store
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Email
        </label>
        <Input
          id="email"
          type="email"
          placeholder="tu@email.com"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-red-500">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Contraseña
        </label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-xs text-red-500">{errors.password.message}</p>
        )}
      </div>

      {showTotp && (
        <div className="space-y-2">
          <label htmlFor="totp" className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Código 2FA
          </label>
          <Input
            id="totp"
            type="text"
            placeholder="000000"
            maxLength={6}
            {...register("totp_code")}
          />
        </div>
      )}

      {!showTotp && (
        <button
          type="button"
          onClick={() => setShowTotp(true)}
          className="text-sm text-blue-600 hover:underline"
        >
          ¿Tienes 2FA habilitado?
        </button>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
      </Button>
    </form>
  )
}