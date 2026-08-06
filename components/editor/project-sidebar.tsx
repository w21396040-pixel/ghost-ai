"use client"

import { FolderOpen, Plus, Users, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

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

export function ProjectSidebar({
  isOpen,
  onClose,
  className,
}: ProjectSidebarProps) {
  return (
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
            <EmptyState icon={FolderOpen} label="No projects yet" />
          </TabsContent>
          <TabsContent value="shared" className="flex h-full flex-col">
            <EmptyState icon={Users} label="No shared projects yet" />
          </TabsContent>
        </ScrollArea>
      </Tabs>

      <div className="border-t border-border p-4">
        <Button className="w-full">
          <Plus />
          New Project
        </Button>
      </div>
    </div>
  )
}
