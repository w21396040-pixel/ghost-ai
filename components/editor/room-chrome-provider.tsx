"use client"

import { createContext, useContext, useState } from "react"

import type { CanvasSaveStatus } from "@/hooks/use-canvas-autosave"

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
  saveStatus: CanvasSaveStatus
  setSaveStatus: (status: CanvasSaveStatus) => void
  triggerSave: () => void
  setTriggerSave: (fn: () => void) => void
  // TEMPORARY diagnostic: see errorDetail in use-canvas-autosave.ts.
  saveErrorDetail: string | null
  setSaveErrorDetail: (detail: string | null) => void
}

const RoomChromeContext = createContext<RoomChromeContextValue | null>(null)

export function RoomChromeProvider({ children }: { children: React.ReactNode }) {
  const [room, setRoom] = useState<RoomInfo | null>(null)
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [isStarterTemplatesOpen, setIsStarterTemplatesOpen] = useState(false)
  const [saveStatus, setSaveStatus] = useState<CanvasSaveStatus>("idle")
  const [triggerSave, setTriggerSaveState] = useState<() => void>(() => () => {})
  const [saveErrorDetail, setSaveErrorDetail] = useState<string | null>(null)

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
        saveStatus,
        setSaveStatus,
        triggerSave,
        setTriggerSave: (fn) => setTriggerSaveState(() => fn),
        saveErrorDetail,
        setSaveErrorDetail,
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
