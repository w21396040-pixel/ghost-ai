"use client"

import { useEffect, useState, useTransition } from "react"

// Fetches through the existing download route (28-spec-persistence-download)
// rather than Blob directly — Content-Disposition only affects real browser
// navigations, `fetch()` just reads the Markdown body as text. Only runs
// while `isOpen`, so closing the modal (or switching away from the Specs
// tab, which unmounts it) drops the fetched content — nothing is cached
// beyond the open preview, per the "do not store spec content in frontend
// state long-term" scope limit.
export function useSpecPreview(
  projectId: string | undefined,
  specId: string | null,
  isOpen: boolean
) {
  const [content, setContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, startTransition] = useTransition()

  useEffect(() => {
    if (!isOpen || !projectId || !specId) return

    startTransition(async () => {
      setContent(null)
      setError(null)
      const response = await fetch(`/api/projects/${projectId}/specs/${specId}/download`)
      if (!response.ok) {
        setError("Failed to load spec content.")
        return
      }
      setContent(await response.text())
    })
  }, [isOpen, projectId, specId])

  return { content, error, isLoading }
}
