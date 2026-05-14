"use client"

import { useState } from "react"
import { TerminalEmulator } from "./terminal-emulator"
import { AIChat } from "./ai-chat"

interface TerminalTabsProps {
  deviceId: number
  hostname: string
  onHistoryChange?: (history: string[]) => void
}

export function TerminalTabs({ deviceId, hostname, onHistoryChange }: TerminalTabsProps) {
  const [active, setActive] = useState<"terminal" | "ai">("terminal")

  const tabs = [
    {
      id: "terminal" as const,
      label: "Terminal",
      icon: (
        <svg viewBox="0 0 24 24" style={{ width: 13, height: 13 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="6" width="16" height="12"/><path d="M7 10l3 2-3 2"/><path d="M13 14h4"/>
        </svg>
      ),
    },
    {
      id: "ai" as const,
      label: "AI Assistant",
      icon: (
        <svg viewBox="0 0 24 24" style={{ width: 13, height: 13 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a10 10 0 0110 10c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2z"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
        </svg>
      ),
    },
  ]

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Tab bar */}
      <div style={{ display: "flex", alignItems: "center", padding: "8px 14px 0", gap: 4, borderBottom: "1px solid var(--line)", background: "rgba(10,14,26,0.5)", flexShrink: 0 }}>
        {tabs.map((tab) => {
          const on = tab.id === active
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "7px 12px 9px",
                borderTopLeftRadius: 8, borderTopRightRadius: 8,
                background: on ? "var(--bg-2, #0f1424)" : "transparent",
                border: on ? "1px solid var(--line)" : "1px solid transparent",
                borderBottomColor: on ? "var(--bg-2, #0f1424)" : "transparent",
                color: on ? "#fff" : "var(--ch-text-3)",
                fontSize: 12.5, fontWeight: on ? 600 : 400,
                cursor: "pointer", fontFamily: "inherit",
                marginBottom: -1, position: "relative",
              }}
              onMouseEnter={(e) => { if (!on) (e.currentTarget as HTMLElement).style.color = "var(--ch-text-2)" }}
              onMouseLeave={(e) => { if (!on) (e.currentTarget as HTMLElement).style.color = "var(--ch-text-3)" }}
            >
              {on && (
                <div style={{
                  position: "absolute", left: 8, right: 8, top: 0, height: 2,
                  background: "linear-gradient(90deg, var(--ch-blue), var(--ch-violet))",
                  borderRadius: 2, boxShadow: "0 0 10px rgba(59,130,246,0.6)",
                }} />
              )}
              {tab.icon}
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, display: active === "terminal" ? "flex" : "none", flexDirection: "column" }}>
        <TerminalEmulator deviceId={deviceId} hostname={hostname} onHistoryChange={onHistoryChange} />
      </div>
      <div style={{ flex: 1, minHeight: 0, display: active === "ai" ? "flex" : "none", flexDirection: "column" }}>
        <AIChat deviceId={deviceId} className="h-full" />
      </div>
    </div>
  )
}
