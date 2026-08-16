"use client"

import { Orbit } from "lucide-react"

import { AiSidebar } from "@/components/editor/ai-sidebar"
import { RoomHeaderSync } from "@/components/editor/room-header-sync"
import { ShareDialog } from "@/components/editor/share-dialog"
import { useRoomChrome } from "@/components/editor/room-chrome-provider"

interface WorkspaceShellProps {
  projectName: string
  projectId: string
  isOwner: boolean
}

export function WorkspaceShell({ projectName, projectId, isOwner }: WorkspaceShellProps) {
  const { isAiSidebarOpen, closeAiSidebar, isShareDialogOpen, closeShareDialog } =
    useRoomChrome()

  return (
    <>
      <RoomHeaderSync title={projectName} projectId={projectId} isOwner={isOwner} />
      <div
        className="relative flex size-full items-center justify-center overflow-hidden bg-background"
        style={{
          backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        <div className="flex max-w-md flex-col items-center gap-4 px-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-full border border-dashed border-accent-primary/40 bg-accent-primary/10">
            <Orbit className="size-6 text-accent-primary" />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              Workspace Shell
            </span>
            <h1 className="font-heading text-2xl font-semibold text-foreground">
              Canvas and collaboration tooling land here next.
            </h1>
            <p className="text-sm text-muted-foreground">
              This room is ready for the shared architecture canvas, durable
              AI workflows, and real-time presence. For now, the shell is
              wired with project context and navigation only.
            </p>
          </div>
        </div>
        <AiSidebar isOpen={isAiSidebarOpen} onClose={closeAiSidebar} />
      </div>
      <ShareDialog
        isOpen={isShareDialogOpen}
        onClose={closeShareDialog}
        projectId={projectId}
        isOwner={isOwner}
      />
    </>
  )
}
