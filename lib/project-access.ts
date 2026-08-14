import { auth, currentUser } from "@clerk/nextjs/server"

import { getAccessibleProject } from "@/lib/projects"

export interface CurrentIdentity {
  userId: string
  email: string | null
}

export async function getCurrentIdentity(): Promise<CurrentIdentity | null> {
  const { userId } = await auth()
  if (!userId) return null

  const user = await currentUser()
  return { userId, email: user?.primaryEmailAddress?.emailAddress ?? null }
}

export function checkProjectAccess(projectId: string, identity: CurrentIdentity) {
  return getAccessibleProject(projectId, identity.userId, identity.email)
}
