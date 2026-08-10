"use client"

import { Plus } from "lucide-react"

import { useProjectDialogsContext } from "@/components/editor/project-dialogs-provider"
import { Button } from "@/components/ui/button"

export function NewProjectButton() {
  const { openCreateDialog } = useProjectDialogsContext()

  return (
    <Button onClick={openCreateDialog}>
      <Plus />
      New Project
    </Button>
  )
}
