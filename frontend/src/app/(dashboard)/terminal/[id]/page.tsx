"use client"

import { use } from "react"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { TerminalTabs } from "@/components/terminal"
import { useRouter } from "next/navigation"

export default function TerminalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const deviceId = parseInt(id, 10)

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Terminal / AI</h1>
          <p className="text-muted-foreground text-sm">Dispositivo #{deviceId}</p>
        </div>
      </div>

      <Card className="flex-1 min-h-0">
        <TerminalTabs deviceId={deviceId} />
      </Card>
    </div>
  )
}