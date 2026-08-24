import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"

type RouteContext = { params: Promise<{ projectId: string }> }

// Metadata only — never returns `filePath` (the Blob URL), since the
// frontend must not access Blob directly (29-spec-ui-integration scope
// limit). `filename` is derived from the spec id rather than the stored
// path, same reasoning as the download route's own Content-Disposition
// name: nothing in ProjectSpec models a human filename.
export async function GET(_request: Request, { params }: RouteContext) {
  const identity = await getCurrentIdentity()
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params
  const project = await checkProjectAccess(projectId, identity)
  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const specs = await prisma.projectSpec.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  })

  return Response.json(
    specs.map((spec) => ({
      id: spec.id,
      createdAt: spec.createdAt,
      filename: `${spec.id}.md`,
    }))
  )
}
