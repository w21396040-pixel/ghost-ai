"use client"

import { Check, Link2, Loader2, Mail, X } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useShareDialog } from "@/hooks/use-share-dialog"

interface ShareDialogProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  isOwner: boolean
}

function initials(name: string | null, email: string) {
  return (name?.trim() || email).slice(0, 1).toUpperCase()
}

export function ShareDialog({ isOpen, onClose, projectId, isOwner }: ShareDialogProps) {
  const {
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
  } = useShareDialog(projectId, isOpen, onClose)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="gap-5 rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share project</DialogTitle>
          <DialogDescription>
            {isOwner
              ? "Invite collaborators, copy the workspace link, and manage access."
              : "People with access to this project."}
          </DialogDescription>
        </DialogHeader>

        {isOwner && (
          <div className="flex flex-col gap-1.5 rounded-2xl border border-border p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">Workspace link</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={handleCopyLink}
              >
                {isCopied ? <Check /> : <Link2 />}
                {isCopied ? "Copied!" : "Copy link"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share a direct link with teammates after you grant them access.
            </p>
          </div>
        )}

        {isOwner && (
          <div className="flex flex-col gap-2">
            <form
              className="flex items-center gap-1 rounded-full border border-border bg-input/30 py-1 pr-1 pl-3"
              onSubmit={(e) => {
                e.preventDefault()
                handleInvite()
              }}
            >
              <Mail className="size-4 shrink-0 text-muted-foreground" />
              <input
                type="email"
                placeholder="teammate@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                className="h-7 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <Button
                type="submit"
                size="sm"
                className="rounded-full bg-accent-primary text-accent-primary-foreground hover:bg-accent-primary/90"
                disabled={!email.trim() || isInviting}
              >
                {isInviting ? "Inviting…" : "Invite"}
              </Button>
            </form>
            {inviteError && <p className="px-1 text-xs text-destructive">{inviteError}</p>}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">People with access</span>
            <span className="text-xs text-muted-foreground">
              {collaborators.length} total
            </span>
          </div>

          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
            {isLoadingList ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : collaborators.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No one has access yet.
              </p>
            ) : (
              collaborators.map((person) => (
                <div
                  key={person.id}
                  className="flex items-center gap-2.5 rounded-2xl border border-border p-2.5"
                >
                  <Avatar>
                    {person.imageUrl && <AvatarImage src={person.imageUrl} alt="" />}
                    <AvatarFallback>{initials(person.name, person.email)}</AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-1 flex-col leading-tight">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-foreground">
                        {person.name ?? person.email}
                      </span>
                      {person.role === "owner" && (
                        <Badge
                          variant="outline"
                          className="text-[0.65rem] tracking-wide uppercase"
                        >
                          Owner
                        </Badge>
                      )}
                    </div>
                    {person.name && (
                      <span className="truncate text-xs text-muted-foreground">
                        {person.email}
                      </span>
                    )}
                  </div>
                  {isOwner && person.role === "collaborator" && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemove(person.id)}
                      disabled={removingId === person.id}
                      aria-label={`Remove ${person.email}`}
                    >
                      <X />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
