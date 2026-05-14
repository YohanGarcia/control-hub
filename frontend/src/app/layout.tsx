import type { Metadata } from "next"
import "./globals.css"
import { Inter, JetBrains_Mono } from "next/font/google"
import { ThemeProvider } from "@/components/providers/theme-provider"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" })
import { WebSocketProvider } from "@/components/providers/websocket-provider"
import { QueryProvider } from "@/components/query-provider"

export const metadata: Metadata = {
  title: {
    default: "Control Hub",
    template: "%s | Control Hub",
  },
  description:
    "Monitoriza y controla dispositivos Windows/Linux remotos desde una plataforma unificada. Gestiona tu infraestructura de manera centralizada con métricas en tiempo real, terminal interactivo y asistencia IA.",
  keywords: [
    "monitorización",
    "control remoto",
    "dispositivos",
    "sysadmin",
    "remote monitoring",
    "device management",
  ],
  authors: [{ name: "Control Hub Team" }],
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: process.env.NEXT_PUBLIC_URL || "https://controlhub.local",
    siteName: "Control Hub",
    title: "Control Hub",
    description: "Plataforma de monitoreo y control de dispositivos remotos",
  },
  twitter: {
    card: "summary_large_image",
    title: "Control Hub",
    description: "Plataforma de monitoreo y control de dispositivos remotos",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className={`antialiased ${inter.variable} ${jetbrainsMono.variable}`}>
        <ThemeProvider>
          <WebSocketProvider>
            <QueryProvider>{children}</QueryProvider>
          </WebSocketProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}