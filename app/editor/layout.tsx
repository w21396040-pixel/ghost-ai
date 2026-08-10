import { auth, currentUser } from "@clerk/nextjs/server"

import { EditorShell } from "@/components/editor/editor-shell"
import { getOwnedProjects, getSharedProjects } from "@/lib/projects"
import type { Project } from "@/types/project"

export default async function EditorLayout({ children }: LayoutProps<"/editor">) {
  const { userId } = await auth()
  if (!userId) {
    return <EditorShell ownedProjects={[]} sharedProjects={[]}>{children}</EditorShell>
  }

  const user = await currentUser()
  const email = user?.primaryEmailAddress?.emailAddress

  const [owned, shared] = await Promise.all([
    getOwnedProjects(userId),
    getSharedProjects(email),
  ])

  const ownedProjects: Project[] = owned.map((project) => ({
    id: project.id,
    name: project.name,
    isOwner: true,
  }))
  const sharedProjects: Project[] = shared.map((project) => ({
    id: project.id,
    name: project.name,
    isOwner: false,
  }))

  return (
    <EditorShell ownedProjects={ownedProjects} sharedProjects={sharedProjects}>
      {children}
    </EditorShell>
  )
}
