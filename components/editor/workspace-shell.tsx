"use client"

import { AiSidebar } from "@/components/editor/ai-sidebar"
import { CanvasRoom } from "@/components/editor/canvas-room"
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
      <div className="relative size-full overflow-hidden bg-background">
        <CanvasRoom roomId={projectId} />
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
