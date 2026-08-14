"use client"

import { Component, type ReactNode, useState } from "react"
import { AlertTriangle } from "lucide-react"
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
  useErrorListener,
} from "@liveblocks/react/suspense"

import { Canvas } from "@/components/editor/canvas"

import "@xyflow/react/dist/style.css"
import "@liveblocks/react-ui/styles.css"
import "@liveblocks/react-flow/styles.css"

interface CanvasRoomProps {
  roomId: string
}

function CanvasLoading() {
  return (
    <div className="flex size-full items-center justify-center bg-background text-sm text-muted-foreground">
      Connecting to the canvas…
    </div>
  )
}

function CanvasConnectionError() {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-2 bg-background text-center">
      <AlertTriangle className="size-6 text-destructive" />
      <p className="text-sm font-medium text-foreground">
        Couldn&apos;t connect to the canvas.
      </p>
      <p className="text-xs text-muted-foreground">
        Check your connection and refresh the page.
      </p>
    </div>
  )
}

// Catches errors thrown during render (e.g. a Liveblocks hook throwing
// synchronously). Room-connection failures (auth rejected, no access, room
// full, etc.) don't throw — they surface asynchronously via useErrorListener
// below — so this is a defense-in-depth fallback, not the primary path.
class CanvasRenderErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    return this.state.hasError ? <CanvasConnectionError /> : this.props.children
  }
}

function CanvasConnectionGuard() {
  const [hasConnectionError, setHasConnectionError] = useState(false)

  useErrorListener((error) => {
    if (error.context.type === "ROOM_CONNECTION_ERROR") {
      setHasConnectionError(true)
    }
  })

  if (hasConnectionError) {
    return <CanvasConnectionError />
  }

  return (
    <ClientSideSuspense fallback={<CanvasLoading />}>
      <Canvas />
    </ClientSideSuspense>
  )
}

export function CanvasRoom({ roomId }: CanvasRoomProps) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth" badgeLocation="bottom-right">
      <RoomProvider id={roomId} initialPresence={{ cursor: null, isThinking: false }}>
        <CanvasRenderErrorBoundary>
          <CanvasConnectionGuard />
        </CanvasRenderErrorBoundary>
      </RoomProvider>
    </LiveblocksProvider>
  )
}
