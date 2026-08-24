"use client"

import { useEffect, useState, useTransition } from "react"

import type { ProjectSpecSummary } from "@/types/spec"

// Same fetch-on-mount + useTransition shape as use-share-dialog.ts's list
// fetch — avoids a synchronous setState in the effect body
// (react-hooks/set-state-in-effect, see 09-share-dialog's Completed entry).
export function useProjectSpecs(projectId: string | undefined) {
  const [specs, setSpecs] = useState<ProjectSpecSummary[]>([])
  const [isLoading, startTransition] = useTransition()
  const [refreshIndex, setRefreshIndex] = useState(0)

  useEffect(() => {
    if (!projectId) return

    startTransition(async () => {
      const response = await fetch(`/api/projects/${projectId}/specs`)
      const data: ProjectSpecSummary[] = response.ok ? await response.json() : []
      setSpecs(data)
    })
    // refreshIndex isn't read in the body — bumping it is just how callers
    // (e.g. specs-panel.tsx after a spec finishes generating) ask this
    // effect to re-run and re-fetch the list.
  }, [projectId, refreshIndex])

  const refresh = () => setRefreshIndex((index) => index + 1)

  return { specs, isLoading, refresh }
}
