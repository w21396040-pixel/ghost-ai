"use client"

import { UserButton, useUser } from "@clerk/nextjs"
import { useOthers } from "@liveblocks/react"
import { Avatar } from "@liveblocks/react-ui"

const MAX_VISIBLE_COLLABORATORS = 5

// Forced on both the collaborator avatars and the Clerk UserButton below
// (via inline style, not a Tailwind class — guarantees the override
// regardless of either component's own stylesheet, same reasoning
// canvas-node.tsx's connection handles already use) so the whole group
// reads as one consistent size.
const AVATAR_SIZE = 28

export function PresenceAvatars() {
  const { user } = useUser()
  const others = useOthers()

  // useOthers() already excludes the current connection, but not the same
  // Clerk user connected from a second tab/window — filter those out too.
  const collaborators = user ? others.filter((other) => other.id !== user.id) : others
  const visibleCollaborators = collaborators.slice(0, MAX_VISIBLE_COLLABORATORS)
  const overflowCount = collaborators.length - visibleCollaborators.length

  return (
    <div className="absolute top-3 right-3 z-10 flex items-center gap-2 rounded-full border border-border bg-popover/95 p-1 backdrop-blur-sm">
      {collaborators.length > 0 && (
        <>
          <div className="flex items-center -space-x-2">
            {visibleCollaborators.map((other) => (
              <Avatar
                key={other.connectionId}
                src={other.info.avatar}
                name={other.info.name}
                style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
                className="rounded-full ring-2 ring-popover"
              />
            ))}
            {overflowCount > 0 && (
              <div
                style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
                className="flex items-center justify-center rounded-full bg-muted text-[0.65rem] font-medium text-muted-foreground ring-2 ring-popover"
              >
                +{overflowCount}
              </div>
            )}
          </div>
          <div className="h-5 w-px shrink-0 bg-border" />
        </>
      )}
      <UserButton
        appearance={{
          elements: {
            userButtonAvatarBox: { width: AVATAR_SIZE, height: AVATAR_SIZE },
          },
        }}
      />
    </div>
  )
}
