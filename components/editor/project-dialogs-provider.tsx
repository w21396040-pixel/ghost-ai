"use client"

import { createContext, useContext } from "react"

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
  const actions = useProjectActions()
  return (
    <ProjectDialogsContext.Provider value={{ ...actions, ownedProjects, sharedProjects }}>
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
