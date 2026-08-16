"use client"

import { useState } from "react"

import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ProjectDialogsProvider } from "@/components/editor/project-dialogs-provider"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { RoomChromeProvider } from "@/components/editor/room-chrome-provider"
import type { Project } from "@/types/project"

interface EditorShellProps {
  ownedProjects: Project[]
  sharedProjects: Project[]
  children: React.ReactNode
}

export function EditorShell({ ownedProjects, sharedProjects, children }: EditorShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <RoomChromeProvider>
      <ProjectDialogsProvider ownedProjects={ownedProjects} sharedProjects={sharedProjects}>
        <div className="flex h-screen flex-col">
          <EditorNavbar
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
          />
          <div className="relative flex-1 overflow-hidden">
            <ProjectSidebar
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
            />
            {children}
          </div>
        </div>
        <ProjectDialogs />
      </ProjectDialogsProvider>
    </RoomChromeProvider>
  )
}
