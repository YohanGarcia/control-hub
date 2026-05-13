"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { registerSchema, type RegisterInput } from "@/lib/schemas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuthStore } from "@/stores/authStore"
import { useRouter } from "next/navigation"

export function RegisterForm() {
  const router = useRouter()
  const { register: registerUser, isLoading, error } = useAuthStore()

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      full_name: "",
    },
  })

  const onSubmit = async (data: RegisterInput) => {
    try {
      await registerUser(data.email, data.password, data.full_name)
      router.push("/login")
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
        <label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Nombre completo (opcional)
        </label>
        <Input
          id="name"
          type="text"
          placeholder="Tu nombre"
          {...register("full_name")}
        />
      </div>

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
          placeholder="••••••••••"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-xs text-red-500">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Creando cuenta..." : "Crear cuenta"}
      </Button>
    </form>
  )
}