"use client"

import { FolderOpen, Pencil, Plus, Trash2, Users, X } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

import { useProjectDialogsContext } from "@/components/editor/project-dialogs-provider"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import type { Project } from "@/types/project"

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
  className?: string
}

function EmptyState({
  icon: Icon,
  label,
}: {
  icon: typeof FolderOpen
  label: string
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center">
      <Icon className="size-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

function ProjectListItem({
  project,
  isActive,
  onRename,
  onDelete,
}: {
  project: Project
  isActive?: boolean
  onRename?: (project: Project) => void
  onDelete?: (project: Project) => void
}) {
  const router = useRouter()

  function openProject() {
    router.push(`/editor/${project.id}`)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openProject}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          openProject()
        }
      }}
      className={cn(
        "group flex cursor-pointer items-center justify-between gap-2 rounded-xl px-2.5 py-2 hover:bg-muted",
        isActive && "bg-accent-primary/10"
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden="true"
          className={cn(
            "size-1.5 shrink-0 rounded-full bg-accent-primary",
            isActive ? "opacity-100" : "opacity-0"
          )}
        />
        <span
          className={cn(
            "truncate text-sm",
            isActive ? "font-medium text-accent-primary" : "text-foreground"
          )}
        >
          {project.name}
        </span>
      </span>
      {project.isOwner && (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={(e) => {
              e.stopPropagation()
              onRename?.(project)
            }}
            aria-label={`Rename ${project.name}`}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={(e) => {
              e.stopPropagation()
              onDelete?.(project)
            }}
            aria-label={`Delete ${project.name}`}
          >
            <Trash2 />
          </Button>
        </div>
      )}
    </div>
  )
}

export function ProjectSidebar({
  isOpen,
  onClose,
  className,
}: ProjectSidebarProps) {
  const pathname = usePathname()
  const {
    ownedProjects,
    sharedProjects,
    openCreateDialog,
    openRenameDialog,
    openDeleteDialog,
  } = useProjectDialogsContext()

  return (
    <>
      <div
        data-open={isOpen}
        onClick={onClose}
        aria-hidden="true"
        className="absolute inset-0 z-30 hidden bg-black/50 opacity-0 transition-opacity duration-200 ease-in-out max-md:data-[open=true]:block max-md:data-[open=true]:opacity-100"
      />
      <div
        data-open={isOpen}
        className={cn(
          "absolute top-3 bottom-3 left-3 z-40 flex w-72 -translate-x-[calc(100%+0.75rem)] flex-col rounded-2xl border border-border bg-popover/95 shadow-lg backdrop-blur-sm transition-transform duration-200 ease-in-out data-[open=true]:translate-x-0",
          className
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-heading text-sm font-medium text-foreground">
            Projects
          </h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close projects sidebar"
          >
            <X />
          </Button>
        </div>

        <Tabs defaultValue="my-projects" className="flex flex-1 flex-col overflow-hidden px-4 pt-3">
          <TabsList className="w-full">
            <TabsTrigger value="my-projects" className="flex-1">
              My Projects
            </TabsTrigger>
            <TabsTrigger value="shared" className="flex-1">
              Shared
            </TabsTrigger>
          </TabsList>
          <ScrollArea className="flex-1">
            <TabsContent value="my-projects" className="flex h-full flex-col">
              {ownedProjects.length > 0 ? (
                <div className="flex flex-col gap-0.5 py-2">
                  {ownedProjects.map((project) => (
                    <ProjectListItem
                      key={project.id}
                      project={project}
                      isActive={pathname === `/editor/${project.id}`}
                      onRename={openRenameDialog}
                      onDelete={openDeleteDialog}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState icon={FolderOpen} label="No projects yet" />
              )}
            </TabsContent>
            <TabsContent value="shared" className="flex h-full flex-col">
              {sharedProjects.length > 0 ? (
                <div className="flex flex-col gap-0.5 py-2">
                  {sharedProjects.map((project) => (
                    <ProjectListItem
                      key={project.id}
                      project={project}
                      isActive={pathname === `/editor/${project.id}`}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState icon={Users} label="No shared projects yet" />
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="border-t border-border p-4">
          <Button className="w-full" onClick={openCreateDialog}>
            <Plus />
            New Project
          </Button>
        </div>
      </div>
    </>
  )
}
