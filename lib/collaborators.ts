import { clerkClient } from "@clerk/nextjs/server"

import { prisma } from "@/lib/prisma"
import type { Collaborator } from "@/types/collaborator"

export function listCollaborators(projectId: string) {
  return prisma.projectCollaborator.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  })
}

export function findCollaboratorByEmail(projectId: string, email: string) {
  return prisma.projectCollaborator.findUnique({
    where: { projectId_email: { projectId, email } },
  })
}

export function addCollaborator(projectId: string, email: string) {
  return prisma.projectCollaborator.create({ data: { projectId, email } })
}

export function removeCollaborator(projectId: string, collaboratorId: string) {
  return prisma.projectCollaborator.deleteMany({
    where: { id: collaboratorId, projectId },
  })
}

export async function enrichCollaborators(
  collaborators: { id: string; email: string }[]
): Promise<Collaborator[]> {
  if (collaborators.length === 0) return []

  const client = await clerkClient()
  type ClerkUser = Awaited<ReturnType<typeof client.users.getUserList>>["data"][number]

  // Batch emails into groups of 100 to avoid exceeding API limits
  const BATCH_SIZE = 100
  const emailBatches: string[][] = []
  for (let i = 0; i < collaborators.length; i += BATCH_SIZE) {
    emailBatches.push(collaborators.slice(i, i + BATCH_SIZE).map((c) => c.email))
  }

  // Fetch users for all batches
  const allUsers: ClerkUser[] = []
  for (const emailBatch of emailBatches) {
    const { data: users } = await client.users.getUserList({
      emailAddress: emailBatch,
      limit: emailBatch.length,
    })
    allUsers.push(...users)
  }

  return collaborators.map((collaborator) => {
    const target = collaborator.email.toLowerCase()
    const user = allUsers.find((candidate) =>
      candidate.emailAddresses.some(
        (address) => address.emailAddress.toLowerCase() === target
      )
    )

    const name = user
      ? [user.firstName, user.lastName].filter(Boolean).join(" ") || null
      : null

    return {
      id: collaborator.id,
      email: collaborator.email,
      name,
      imageUrl: user?.imageUrl ?? null,
      role: "collaborator",
    }
  })
}

export async function getOwnerEntry(ownerId: string): Promise<Collaborator> {
  const client = await clerkClient()

  try {
    const user = await client.users.getUser(ownerId)
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || null

    return {
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress ?? "",
      name,
      imageUrl: user.imageUrl,
      role: "owner",
    }
  } catch {
    return { id: ownerId, email: "", name: null, imageUrl: null, role: "owner" }
  }
}
