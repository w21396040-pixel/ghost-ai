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
import { PresenceAvatars } from "@/components/editor/presence-avatars"

import "@xyflow/react/dist/style.css"
import "@liveblocks/react-ui/styles.css"
// The app forces dark mode via `className="dark"` on <html> (app/layout.tsx),
// not `prefers-color-scheme` — so the "attributes" dark stylesheet is the
// matching variant, not the media-query one.
import "@liveblocks/react-ui/styles/dark/attributes.css"
import "@liveblocks/react-flow/styles.css"

interface CanvasRoomProps {
  roomId: string
  // Rendered as a sibling of the canvas tree, inside RoomProvider but outside
  // CanvasConnectionGuard's Suspense/error boundary — so room-scoped chrome
  // (the AI sidebar) keeps working off Presence/Feed data even while the
  // canvas itself is still connecting or has errored, per this chapter's
  // "keep the rest of the sidebar usable" scope limit.
  children?: ReactNode
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

function CanvasConnectionGuard({ roomId }: { roomId: string }) {
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
      <div className="relative size-full">
        <Canvas projectId={roomId} />
        <PresenceAvatars />
      </div>
    </ClientSideSuspense>
  )
}

export function CanvasRoom({ roomId, children }: CanvasRoomProps) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth" badgeLocation="bottom-right">
      <RoomProvider id={roomId} initialPresence={{ cursor: null, thinking: false }}>
        <CanvasRenderErrorBoundary>
          <CanvasConnectionGuard roomId={roomId} />
        </CanvasRenderErrorBoundary>
        {children}
      </RoomProvider>
    </LiveblocksProvider>
  )
}
