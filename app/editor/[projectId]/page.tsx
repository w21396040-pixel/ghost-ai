import { auth, currentUser } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"

import { getAccessibleProject } from "@/lib/projects"

export default async function ProjectWorkspacePage(props: PageProps<"/editor/[projectId]">) {
  const { projectId } = await props.params

  const { userId } = await auth()
  if (!userId) {
    notFound()
  }

  const user = await currentUser()
  const email = user?.primaryEmailAddress?.emailAddress

  const project = await getAccessibleProject(projectId, userId, email)
  if (!project) {
    notFound()
  }

  return (
    <div className="flex size-full flex-col items-center justify-center gap-1.5 px-4 text-center">
      <h1 className="font-heading text-lg font-medium text-foreground">
        {project.name}
      </h1>
      <p className="text-sm text-muted-foreground">Canvas coming soon</p>
    </div>
  )
}
