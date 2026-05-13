"use client"

import { type ReactNode, useEffect, startTransition } from "react"

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    startTransition(() => {
      document.documentElement.classList.add("dark")
    })
  }, [])

  return <>{children}</>
}