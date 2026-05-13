"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { X, Monitor, Building2, Rocket, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthStore } from "@/stores/authStore"
import { useUIStore } from "@/stores/uiStore"
import { organizationsApi } from "@/lib/api/organizations"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { cn } from "@/lib/utils"

const createOrgSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
})

type CreateOrgForm = z.infer<typeof createOrgSchema>

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .substring(0, 50)
}

const steps = [
  {
    id: 1,
    title: "Bienvenido",
    description: "Configura tu cuenta en minutos",
    icon: Rocket,
  },
  {
    id: 2,
    title: "Organización",
    description: "Crea tu primera organización",
    icon: Building2,
  },
  {
    id: 3,
    title: "Dispositivos",
    description: "Agrega tu primer dispositivo",
    icon: Monitor,
  },
  {
    id: 4,
    title: "Completado",
    description: "Estás listo para comenzar",
    icon: CheckCircle2,
  },
]

export function OnboardingWizard() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const { setCurrentOrganizationId } = useUIStore()
  const [currentStep, setCurrentStep] = useState(1)
  const [orgName, setOrgName] = useState("")
  const [isCreatingOrg, setIsCreatingOrg] = useState(false)
  const [error, setError] = useState("")

  const { register, handleSubmit, formState: { errors } } = useForm<CreateOrgForm>({
    resolver: zodResolver(createOrgSchema),
  })

  const handleCreateOrg = async (data: CreateOrgForm) => {
    setIsCreatingOrg(true)
    setError("")
    try {
      const org = await organizationsApi.create({ name: data.name, slug: generateSlug(data.name) })
      setCurrentOrganizationId(org.id)
      setOrgName(org.name)
      setCurrentStep(3)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsCreatingOrg(false)
    }
  }

  const handleFinish = () => {
    localStorage.setItem("onboarding_completed", "true")
    router.push("/")
  }

  if (!isAuthenticated) return null

  const isCompleted = localStorage.getItem("onboarding_completed") === "true"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="relative">
          <button
            onClick={handleFinish}
            className="absolute right-4 top-4 p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="text-center">
            <CardTitle className="text-2xl">¡Bienvenido a Control Hub!</CardTitle>
            <CardDescription className="mt-2">
              Completa los siguientes pasos para configurar tu cuenta
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2">
              {steps.map((step, index) => {
                const Icon = step.icon
                const isActive = currentStep === step.id
                const isCompleted = currentStep > step.id

                return (
                  <div key={step.id} className="flex items-center">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                        isActive && "border-blue-500 bg-blue-500 text-white",
                        isCompleted && "border-green-500 bg-green-500 text-white",
                        !isActive && !isCompleted && "border-gray-300 text-gray-400"
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={cn(
                          "h-0.5 w-8 bg-gray-300",
                          isCompleted && "bg-green-500"
                        )}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="min-h-[200px]">
            {currentStep === 1 && (
              <div className="space-y-4 text-center">
                <Rocket className="mx-auto h-16 w-16 text-blue-500" />
                <h3 className="text-lg font-semibold">Bienvenido a Control Hub</h3>
                <p className="text-sm text-muted-foreground">
                  La plataforma para monitorear y controlar tus dispositivos Windows/Linux de forma centralizada.
                </p>
                <div className="space-y-2 text-left bg-muted p-4 rounded-lg">
                  <p className="text-sm font-medium">Con Control Hub puedes:</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Monitorear el estado de tus dispositivos en tiempo real</li>
                    <li>Ejecutar acciones remotas</li>
                    <li>Acceder a terminal interactivo</li>
                    <li>Obtener asistencia de IA para troubleshooting</li>
                    <li>Gestionar equipos y permisos</li>
                  </ul>
                </div>
                <Button onClick={() => setCurrentStep(2)} className="w-full">
                  Comenzar
                </Button>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="text-center">
                  <Building2 className="mx-auto h-16 w-16 text-blue-500" />
                  <h3 className="text-lg font-semibold">Crea tu organización</h3>
                  <p className="text-sm text-muted-foreground">
                    Una organización te permite gestionar equipos y dispositivos
                  </p>
                </div>
                <form onSubmit={handleSubmit(handleCreateOrg)} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Nombre de la organización</label>
                    <input
                      {...register("name")}
                      placeholder="Mi Empresa"
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
                    )}
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <Button type="submit" disabled={isCreatingOrg} className="w-full">
                    {isCreatingOrg ? "Creando..." : "Crear organización"}
                  </Button>
                </form>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4 text-center">
                <Monitor className="mx-auto h-16 w-16 text-blue-500" />
                <h3 className="text-lg font-semibold">Agrega tu primer dispositivo</h3>
                <p className="text-sm text-muted-foreground">
                  La organización <strong>{orgName}</strong> está lista.
                </p>
                <div className="bg-muted p-4 rounded-lg text-left space-y-2">
                  <p className="text-sm font-medium">Para agregar un dispositivo:</p>
                  <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                    <li>Instala el agente de Control Hub en tu dispositivo</li>
                    <li>Genera un token de enrollamiento desde Settings → Team</li>
                    <li>Configura el agente con el token</li>
                  </ol>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setCurrentStep(4)} className="flex-1">
                    Saltar por ahora
                  </Button>
                  <Button onClick={() => setCurrentStep(4)} className="flex-1">
                    Continuar
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4 text-center">
                <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
                <h3 className="text-lg font-semibold">¡Todo listo!</h3>
                <p className="text-sm text-muted-foreground">
                  Tu cuenta está configurada. Explora el dashboard para ver tus dispositivos.
                </p>
                <Button onClick={handleFinish} className="w-full">
                  Ir al Dashboard
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}