"use client"

import { useEffect, useState, useTransition } from "react"

import type { Collaborator } from "@/types/collaborator"

export function useShareDialog(projectId: string, isOpen: boolean, onClose: () => void) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [isLoadingList, startListTransition] = useTransition()
  const [email, setEmail] = useState("")
  const [isInviting, setIsInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    startListTransition(async () => {
      const response = await fetch(`/api/projects/${projectId}/collaborators`)
      const data: Collaborator[] = response.ok ? await response.json() : []
      setCollaborators(data)
    })
  }, [isOpen, projectId])

  async function handleInvite() {
    const trimmed = email.trim()
    if (!trimmed) return

    setIsInviting(true)
    setInviteError(null)
    try {
      const response = await fetch(`/api/projects/${projectId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        setInviteError(body?.error ?? "Failed to invite collaborator")
        return
      }

      const collaborator: Collaborator = await response.json()
      setCollaborators((prev) => [...prev, collaborator])
      setEmail("")
    } catch (error) {
      setInviteError("Failed to invite collaborator")
    } finally {
      setIsInviting(false)
    }
  }

  async function handleRemove(collaboratorId: string) {
    setRemovingId(collaboratorId)
    try {
      const response = await fetch(
        `/api/projects/${projectId}/collaborators/${collaboratorId}`,
        { method: "DELETE" }
      )
      if (!response.ok) return
      setCollaborators((prev) => prev.filter((c) => c.id !== collaboratorId))
    } finally {
      setRemovingId(null)
    }
  }

  function handleCopyLink() {
    const url = `${window.location.origin}/editor/${projectId}`
    navigator.clipboard.writeText(url)
      .then(() => {
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      })
      .catch(() => {
        // Failed to copy
      })
  }

  function handleClose() {
    setEmail("")
    setInviteError(null)
    setIsCopied(false)
    onClose()
  }

  return {
    collaborators,
    isLoadingList,
    email,
    setEmail,
    isInviting,
    inviteError,
    handleInvite,
    removingId,
    handleRemove,
    isCopied,
    handleCopyLink,
    handleClose,
  }
}
