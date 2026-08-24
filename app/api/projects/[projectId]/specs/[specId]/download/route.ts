import { loadSpecMarkdown } from "@/lib/spec-storage"
import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"

type RouteContext = { params: Promise<{ projectId: string; specId: string }> }

export async function GET(_request: Request, { params }: RouteContext) {
  const identity = await getCurrentIdentity()
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId, specId } = await params

  // Same "owner or collaborator" access level app/api/projects/[projectId]/canvas/route.ts
  // uses for reading canvas content — a spec is project content, not an
  // owner-only mutation. A missing project and a project the user can't
  // access are told apart below rather than collapsed into one 404, per this
  // route's own "handle not found and forbidden cases properly" requirement.
  const project = await checkProjectAccess(projectId, identity)
  if (!project) {
    const exists = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    })
    return Response.json(
      { error: exists ? "Forbidden" : "Not found" },
      { status: exists ? 403 : 404 }
    )
  }

  const spec = await prisma.projectSpec.findUnique({ where: { id: specId } })
  if (!spec || spec.projectId !== projectId) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const markdown = await loadSpecMarkdown(spec.filePath)
  if (markdown === null) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${projectId}-spec.md"`,
    },
  })
}
