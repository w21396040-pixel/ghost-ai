import { prisma } from "@/lib/prisma"

export function getOwnedProjects(ownerId: string) {
  return prisma.project.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
  })
}

export function getSharedProjects(email: string | null | undefined) {
  if (!email) return Promise.resolve([])

  return prisma.project.findMany({
    where: { collaborators: { some: { email } } },
    orderBy: { createdAt: "desc" },
  })
}

export function getAccessibleProject(
  projectId: string,
  userId: string,
  email: string | null | undefined
) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [{ ownerId: userId }, ...(email ? [{ collaborators: { some: { email } } }] : [])],
    },
  })
}
