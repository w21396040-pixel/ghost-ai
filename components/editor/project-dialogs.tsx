"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useProjectDialogsContext } from "@/components/editor/project-dialogs-provider"

export function ProjectDialogs() {
  const {
    dialog,
    name,
    setName,
    roomId,
    isLoading,
    closeDialog,
    handleCreateSubmit,
    handleRenameSubmit,
    handleDeleteConfirm,
  } = useProjectDialogsContext()

  return (
    <>
      <Dialog
        open={dialog?.type === "create"}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleCreateSubmit()
            }}
          >
            <DialogHeader>
              <DialogTitle>Create project</DialogTitle>
              <DialogDescription>
                Start a new architecture workspace.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 py-4">
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project name"
              />
              <p className="px-0.5 text-xs text-muted-foreground">
                Room ID: <span className="font-mono">{roomId || "—"}</span>
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim() || isLoading}>
                {isLoading ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog?.type === "rename"}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleRenameSubmit()
            }}
          >
            <DialogHeader>
              <DialogTitle>Rename project</DialogTitle>
              <DialogDescription>
                {dialog?.type === "rename"
                  ? `Renaming "${dialog.project.name}".`
                  : null}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project name"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim() || isLoading}>
                {isLoading ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog?.type === "delete"}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>
              {dialog?.type === "delete"
                ? `This will permanently delete "${dialog.project.name}". This action cannot be undone.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isLoading}
            >
              {isLoading ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
