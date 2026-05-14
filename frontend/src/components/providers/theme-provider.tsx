"use client"

import { type ReactNode, useEffect, startTransition } from "react"

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    startTransition(() => {
      document.documentElement.classList.add("dark")

      document.body.style.background = `
        radial-gradient(900px 700px at 12% 8%, rgba(59,130,246,0.14), transparent 55%),
        radial-gradient(900px 700px at 88% 95%, rgba(139,92,246,0.14), transparent 55%),
        linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px),
        #0a0e1a
      `.trim()
      document.body.style.backgroundSize = "auto, auto, 56px 56px, 56px 56px, auto"
      document.body.style.backgroundAttachment = "fixed"
    })
  }, [])

  return <>{children}</>
}