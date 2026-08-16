"use client"

import { createContext, useContext, useEffect, useState } from "react"

import { useProjectActions, type UseProjectActionsReturn } from "@/hooks/use-project-actions"
import type { Project } from "@/types/project"

type ProjectDialogsContextValue = UseProjectActionsReturn & {
  ownedProjects: Project[]
  sharedProjects: Project[]
}

const ProjectDialogsContext = createContext<ProjectDialogsContextValue | null>(null)

interface ProjectDialogsProviderProps {
  ownedProjects: Project[]
  sharedProjects: Project[]
  children: React.ReactNode
}

export function ProjectDialogsProvider({
  ownedProjects,
  sharedProjects,
  children,
}: ProjectDialogsProviderProps) {
  const [ownedProjectsState, setOwnedProjectsState] = useState(ownedProjects)

  // Keep in sync with server-refreshed props (e.g. after rename/delete),
  // while still allowing optimistic local appends on create.
  useEffect(() => {
    setOwnedProjectsState(ownedProjects)
  }, [ownedProjects])

  const actions = useProjectActions({
    onProjectCreated: (project) =>
      setOwnedProjectsState((prev) => [...prev, project]),
    onProjectDeleted: (projectId) =>
      setOwnedProjectsState((prev) => prev.filter((project) => project.id !== projectId)),
  })

  return (
    <ProjectDialogsContext.Provider
      value={{ ...actions, ownedProjects: ownedProjectsState, sharedProjects }}
    >
      {children}
    </ProjectDialogsContext.Provider>
  )
}

export function useProjectDialogsContext() {
  const context = useContext(ProjectDialogsContext)
  if (!context) {
    throw new Error(
      "useProjectDialogsContext must be used within a ProjectDialogsProvider"
    )
  }
  return context
}
