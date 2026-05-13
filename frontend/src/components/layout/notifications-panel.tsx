"use client"

import { X } from "lucide-react"
import { useUIStore } from "@/stores/uiStore"
import { cn } from "@/lib/utils"

const notifications = [
  {
    id: 1,
    title: "Dispositivo offline",
    message: "Server-01 se ha desconectado",
    time: "Hace 5 minutos",
    type: "error" as const,
  },
  {
    id: 2,
    title: "Acción completada",
    message: "Reinicio de Server-02 exitoso",
    time: "Hace 15 minutos",
    type: "success" as const,
  },
  {
    id: 3,
    title: "Nueva métrica",
    message: "CPU de Server-01 por encima del 90%",
    time: "Hace 30 minutos",
    type: "warning" as const,
  },
]

export function NotificationsPanel() {
  const { notificationsOpen, setNotificationsOpen } = useUIStore()

  return (
    <>
      {notificationsOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50"
          onClick={() => setNotificationsOpen(false)}
        />
      )}

      <div
        className={cn(
          "fixed right-0 top-0 z-50 h-screen w-80 transform transition-transform duration-300 ease-in-out",
          notificationsOpen ? "translate-x-0" : "translate-x-full",
          "bg-white dark:bg-[#0B1120] border-l border-gray-200 dark:border-gray-800"
        )}
      >
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notificaciones</h2>
          <button
            onClick={() => setNotificationsOpen(false)}
            className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto h-full pb-20">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <p>No hay notificaciones</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "mt-1 h-2 w-2 rounded-full shrink-0",
                        notification.type === "error" && "bg-red-500",
                        notification.type === "success" && "bg-green-500",
                        notification.type === "warning" && "bg-yellow-500"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{notification.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}