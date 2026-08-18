"use client"

import { useOther } from "@liveblocks/react"
import { Cursors, type CursorsCursorProps } from "@liveblocks/react-flow"
import { Cursor } from "@liveblocks/react-ui"

// Reads presence color/name straight from UserMeta.info (set at auth time by
// /api/liveblocks-auth's identifyUser call) rather than @liveblocks/react-ui's
// default Cursor renderer, which resolves via useUser()/resolveUsers — a
// mechanism this app hasn't configured, since presence.info already has
// everything a cursor label needs.
function ParticipantCursor({ connectionId }: CursorsCursorProps) {
  const info = useOther(connectionId, (other) => other.info)
  return <Cursor color={info.color} label={info.name} />
}

// Cursors (from @liveblocks/react-flow, the package's own documented
// React-Flow-cursors component) keeps cursor coordinates in flow space so
// they track canvas content correctly while panning/zooming, broadcasts the
// current user's position to Presence.cursor on pointer move over the React
// Flow pane, and clears it to null on pointer leave / window blur — the
// exact behaviors this chapter's spec calls for, already implemented and
// used verbatim in Liveblocks' own React Flow integration guide.
export function CanvasCursors() {
  return <Cursors components={{ Cursor: ParticipantCursor }} />
}
