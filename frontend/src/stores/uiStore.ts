import { create } from "zustand"
import { persist } from "zustand/middleware"

interface UIState {
  sidebarCollapsed: boolean
  railExpanded: boolean
  mobileMenuOpen: boolean
  notificationsOpen: boolean
  currentOrganizationId: number | null
  activeDeviceId: number | null

  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleRail: () => void
  setRailExpanded: (expanded: boolean) => void
  toggleMobileMenu: () => void
  setMobileMenuOpen: (open: boolean) => void
  toggleNotifications: () => void
  setNotificationsOpen: (open: boolean) => void
  setCurrentOrganizationId: (id: number | null) => void
  setActiveDeviceId: (id: number | null) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      railExpanded: false,
      mobileMenuOpen: false,
      notificationsOpen: false,
      currentOrganizationId: null,
      activeDeviceId: null,

      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleRail: () => set((state) => ({ railExpanded: !state.railExpanded })),
      setRailExpanded: (expanded) => set({ railExpanded: expanded }),
      toggleMobileMenu: () => set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
      toggleNotifications: () => set((state) => ({ notificationsOpen: !state.notificationsOpen })),
      setNotificationsOpen: (open) => set({ notificationsOpen: open }),
      setCurrentOrganizationId: (id) => set({ currentOrganizationId: id }),
      setActiveDeviceId: (id) => set({ activeDeviceId: id }),
    }),
    {
      name: "ui-storage",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        railExpanded: state.railExpanded,
        currentOrganizationId: state.currentOrganizationId,
        activeDeviceId: state.activeDeviceId,
      }),
    }
  )
)
