"use client"

import { useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

import { slugify } from "@/lib/utils"
import type { Project } from "@/types/project"

type DialogState =
  | { type: "create" }
  | { type: "rename"; project: Project }
  | { type: "delete"; project: Project }
  | null

function generateSuffix() {
  return Math.random().toString(36).slice(2, 8)
}

interface UseProjectActionsOptions {
  onProjectCreated?: (project: Project) => void
  onProjectDeleted?: (projectId: string) => void
}

export function useProjectActions({
  onProjectCreated,
  onProjectDeleted,
}: UseProjectActionsOptions = {}) {
  const router = useRouter()
  const pathname = usePathname()

  const [dialog, setDialog] = useState<DialogState>(null)
  const [name, setName] = useState("")
  const [suffix, setSuffix] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const roomId = useMemo(() => {
    const slug = slugify(name)
    return slug ? `${slug}-${suffix}` : suffix
  }, [name, suffix])

  function openCreateDialog() {
    setName("")
    setSuffix(generateSuffix())
    setDialog({ type: "create" })
  }

  function openRenameDialog(project: Project) {
    setName(project.name)
    setDialog({ type: "rename", project })
  }

  function openDeleteDialog(project: Project) {
    setDialog({ type: "delete", project })
  }

  function closeDialog() {
    if (isLoading) return
    setDialog(null)
    setName("")
  }

  async function handleCreateSubmit() {
    const trimmed = name.trim()
    if (!trimmed) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: roomId, name: trimmed }),
      })
      if (!response.ok) return

      const project = await response.json()
      setDialog(null)
      setName("")
      onProjectCreated?.({ id: project.id, name: project.name, isOwner: true })
      router.push(`/editor/${project.id}`)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRenameSubmit() {
    if (dialog?.type !== "rename") return
    const trimmed = name.trim()
    if (!trimmed) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/projects/${dialog.project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      })
      if (!response.ok) return

      setDialog(null)
      setName("")
      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDeleteConfirm() {
    if (dialog?.type !== "delete") return
    const { project } = dialog

    setIsLoading(true)
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      })
      if (!response.ok) return

      setDialog(null)
      onProjectDeleted?.(project.id)
      if (pathname === `/editor/${project.id}`) {
        router.push("/editor")
      } else {
        router.refresh()
      }
    } finally {
      setIsLoading(false)
    }
  }

  return {
    dialog,
    name,
    setName,
    roomId,
    isLoading,
    openCreateDialog,
    openRenameDialog,
    openDeleteDialog,
    closeDialog,
    handleCreateSubmit,
    handleRenameSubmit,
    handleDeleteConfirm,
  }
}

export type UseProjectActionsReturn = ReturnType<typeof useProjectActions>
