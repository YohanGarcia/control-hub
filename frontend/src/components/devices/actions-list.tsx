"use client"

import { Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { DeviceAction } from "@/lib/api/devices"

interface ActionsListProps {
  actions: DeviceAction[]
  deviceOnline: boolean
  onRunAction: (action: DeviceAction) => void
  runningActionId?: number
  className?: string
}

export function ActionsList({
  actions,
  deviceOnline,
  onRunAction,
  runningActionId,
  className
}: ActionsListProps) {
  if (actions.length === 0) {
    return null
  }

  return (
    <div className={className}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {actions.map((action) => (
          <Card key={action.id} className="cursor-pointer hover:border-blue-500 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{action.name}</CardTitle>
              <CardDescription>{action.slug}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                disabled={!deviceOnline || runningActionId === action.id}
                onClick={() => onRunAction(action)}
              >
                {runningActionId === action.id ? (
                  <span className="animate-pulse">Ejecutando...</span>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Ejecutar
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}