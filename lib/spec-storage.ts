import { get, put } from "@vercel/blob"

// Matches architecture-context.md's Storage Model: generated specs live at
// this deterministic path per spec record, same "one blob per entity, no
// random suffix" reasoning lib/canvas-storage.ts's canvasBlobPath already
// applies to canvas snapshots.
function specBlobPath(projectId: string, specId: string) {
  return `specs/${projectId}/${specId}.md`
}

export async function saveSpecMarkdown(
  projectId: string,
  specId: string,
  markdown: string
): Promise<string> {
  const blob = await put(specBlobPath(projectId, specId), markdown, {
    access: "private",
    contentType: "text/markdown",
    addRandomSuffix: false,
    allowOverwrite: true,
  })
  return blob.url
}

export async function loadSpecMarkdown(filePath: string): Promise<string | null> {
  const result = await get(filePath, { access: "private" })
  if (!result || result.statusCode !== 200) return null

  return new Response(result.stream).text()
}
