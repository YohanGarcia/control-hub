"use client"

import { Terminal as TerminalIcon, Bot } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TerminalEmulator } from "./terminal-emulator"
import { AIChat } from "./ai-chat"

interface TerminalTabsProps {
  deviceId: number
}

export function TerminalTabs({ deviceId }: TerminalTabsProps) {
  return (
    <Tabs defaultValue="terminal" className="h-full flex flex-col">
      <div className="border-b px-4 py-2 dark:border-gray-800">
        <TabsList className="gap-4">
          <TabsTrigger value="terminal" className="gap-2 px-4">
            <TerminalIcon className="h-4 w-4" />
            Terminal
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2 px-4">
            <Bot className="h-4 w-4" />
            AI Assistant
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="terminal" className="flex-1 min-h-0">
        <TerminalEmulator deviceId={deviceId} className="h-full" />
      </TabsContent>

      <TabsContent value="ai" className="flex-1 min-h-0">
        <AIChat deviceId={deviceId} className="h-full" />
      </TabsContent>
    </Tabs>
  )
}