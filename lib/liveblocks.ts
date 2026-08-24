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

// Idempotent feed creation, shared by every call site that needs a feed to
// exist before publishing/reading from it (trigger/design-agent.ts's own
// "ai-status-feed" and app/api/liveblocks-auth/route.ts's "ai-chat", per
// 24-ai-presence-state's Architecture Decision: swallow exactly a 409 (feed
// already exists) — never a bare catch-and-ignore.
//
// Deliberately checks `error.status === 409` structurally rather than
// `error instanceof LiveblocksError`: @liveblocks/node ships both an ESM and
// a CJS build (its package.json `exports` map has separate `import`/`require`
// conditions), and confirmed live — this call site is the first place in the
// app that runs `createFeed` from inside a Next.js/Turbopack route-handler
// bundle rather than the Trigger.dev runtime `design-agent.ts` runs in — that
// `instanceof` fails here even though the thrown error's own `.status` is
// genuinely `409`: Turbopack resolves this module's `@liveblocks/node` import
// to a different bundled copy than the one `client.createFeed()` throws from,
// so the two `LiveblocksError` class references aren't `===`, and the
// `instanceof` check silently rethrows a benign "already exists" as a hard
// failure. A structural check has no such cross-module-identity dependency.
export async function ensureFeed(client: Liveblocks, roomId: string, feedId: string) {
  try {
    await client.createFeed({ roomId, feedId })
  } catch (error) {
    const status = (error as { status?: unknown } | null)?.status
    if (status !== 409) {
      throw error
    }
  }
}

export function getCursorColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0
  }

  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length]
}
