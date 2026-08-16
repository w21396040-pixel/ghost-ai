import { Liveblocks } from "@liveblocks/node"

const globalForLiveblocks = globalThis as unknown as {
  liveblocks?: Liveblocks
}

function createLiveblocksClient(): Liveblocks {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY

  if (!secret) {
    throw new Error("LIVEBLOCKS_SECRET_KEY is not set")
  }

  return new Liveblocks({ secret })
}

// Lazily constructed (not at module eval time) so importing this module
// never fails during the build, only when a request actually needs it.
export function getLiveblocksClient(): Liveblocks {
  const cached = globalForLiveblocks.liveblocks ?? createLiveblocksClient()

  if (process.env.NODE_ENV !== "production") {
    globalForLiveblocks.liveblocks = cached
  }

  return cached
}

// Vivid node-color text values from `ui-context.md`'s canvas palette — already
// tuned for readability on the dark canvas, reused here for cursor colors.
const CURSOR_COLORS = [
  "#52A8FF", // blue
  "#BF7AF0", // purple
  "#FF990A", // orange
  "#FF6166", // red
  "#F75F8F", // pink
  "#62C073", // green
  "#0AC7B4", // teal
]

export function getCursorColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0
  }

  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length]
}
