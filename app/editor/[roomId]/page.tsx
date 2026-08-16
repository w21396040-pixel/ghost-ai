import { redirect } from "next/navigation"

import { AccessDenied } from "@/components/editor/access-denied"
import { WorkspaceShell } from "@/components/editor/workspace-shell"
import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access"

export default async function EditorRoomPage(props: PageProps<"/editor/[roomId]">) {
  const { roomId } = await props.params

  const identity = await getCurrentIdentity()
  if (!identity) {
    redirect("/sign-in")
  }

  const project = await checkProjectAccess(roomId, identity)
  if (!project) {
    return <AccessDenied />
  }

  return (
    <WorkspaceShell
      projectName={project.name}
      projectId={project.id}
      isOwner={project.ownerId === identity.userId}
    />
  )
}
