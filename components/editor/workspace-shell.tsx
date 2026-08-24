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
        {/* AiSidebar is rendered as CanvasRoom's children (inside
            RoomProvider, not inside LiveblocksProvider/RoomProvider's own
            DOM — neither renders a wrapping element) so it stays a sibling
            of the canvas in the DOM/positioning tree while gaining access to
            room Presence/Feed hooks for the shared AI status state. */}
        <CanvasRoom roomId={projectId}>
          <AiSidebar isOpen={isAiSidebarOpen} onClose={closeAiSidebar} />
        </CanvasRoom>
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
