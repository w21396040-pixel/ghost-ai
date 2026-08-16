"use client"

import { createContext, useContext, useState } from "react"

interface RoomInfo {
  title: string
  projectId: string
  isOwner: boolean
}

interface RoomChromeContextValue {
  room: RoomInfo | null
  setRoom: (room: RoomInfo | null) => void
  isAiSidebarOpen: boolean
  toggleAiSidebar: () => void
  closeAiSidebar: () => void
  isShareDialogOpen: boolean
  openShareDialog: () => void
  closeShareDialog: () => void
  isStarterTemplatesOpen: boolean
  openStarterTemplates: () => void
  closeStarterTemplates: () => void
}

const RoomChromeContext = createContext<RoomChromeContextValue | null>(null)

export function RoomChromeProvider({ children }: { children: React.ReactNode }) {
  const [room, setRoom] = useState<RoomInfo | null>(null)
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [isStarterTemplatesOpen, setIsStarterTemplatesOpen] = useState(false)

  return (
    <RoomChromeContext.Provider
      value={{
        room,
        setRoom,
        isAiSidebarOpen,
        toggleAiSidebar: () => setIsAiSidebarOpen((open) => !open),
        closeAiSidebar: () => setIsAiSidebarOpen(false),
        isShareDialogOpen,
        openShareDialog: () => setIsShareDialogOpen(true),
        closeShareDialog: () => setIsShareDialogOpen(false),
        isStarterTemplatesOpen,
        openStarterTemplates: () => setIsStarterTemplatesOpen(true),
        closeStarterTemplates: () => setIsStarterTemplatesOpen(false),
      }}
    >
      {children}
    </RoomChromeContext.Provider>
  )
}

export function useRoomChrome() {
  const context = useContext(RoomChromeContext)
  if (!context) {
    throw new Error("useRoomChrome must be used within a RoomChromeProvider")
  }
  return context
}
