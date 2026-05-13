"use client"

import { ScrollText } from "lucide-react"
import { auditApi } from "@/lib/api/devices"
import { useQuery } from "@tanstack/react-query"
import { LoadingSpinner } from "@/components/shared/loading-spinner"
import { EmptyState } from "@/components/shared/empty-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export default function AuditPage() {
  const { data: events, isLoading } = useQuery({
    queryKey: ["audit-events"],
    queryFn: () => auditApi.getEvents(),
  })

  if (isLoading) {
    return <LoadingSpinner message="Cargando auditoría..." />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Auditoría</h1>
        <p className="text-muted-foreground">Registro de eventos y acciones</p>
      </div>

      {!events || events.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Sin eventos"
          description="No hay eventos de auditoría registrados"
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Eventos recientes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {events.map((event) => (
                <div key={event.id} className="p-4 flex items-start justify-between">
                  <div>
                    <p className="font-medium">{event.event_type}</p>
                    <p className="text-sm text-muted-foreground">
                      {event.target_type && `${event.target_type} #${event.target_id}`}
                      {event.details && ` - ${event.details}`}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}