"use client"

import { useTheme } from "next-themes"
import { useState } from "react"

export function useThemeApp() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted] = useState(false)

  const toggleTheme = () => {
    if (resolvedTheme === "dark") {
      setTheme("light")
    } else if (resolvedTheme === "light") {
      setTheme("system")
    } else {
      setTheme("dark")
    }
  }

  const getThemeIcon = () => {
    if (!mounted) return "Moon"
    if (resolvedTheme === "dark") return "Moon"
    if (resolvedTheme === "light") return "Sun"
    return "Monitor"
  }

  return {
    theme: mounted ? theme : "system",
    resolvedTheme: mounted ? resolvedTheme : "dark",
    setTheme,
    toggleTheme,
    getThemeIcon,
    mounted,
  }
}