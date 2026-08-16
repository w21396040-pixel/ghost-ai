"use client"

import { useEffect } from "react"

import { useRoomChrome } from "@/components/editor/room-chrome-provider"

interface RoomHeaderSyncProps {
  title: string
  projectId: string
  isOwner: boolean
}

export function RoomHeaderSync({ title, projectId, isOwner }: RoomHeaderSyncProps) {
  const { setRoom } = useRoomChrome()

  useEffect(() => {
    setRoom({ title, projectId, isOwner })
    return () => setRoom(null)
  }, [title, projectId, isOwner, setRoom])

  return null
}
