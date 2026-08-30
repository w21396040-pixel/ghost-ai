"use client"

import { useEffect, useRef, useState } from "react"
import type { KeyboardEvent } from "react"
import { useRealtimeRun } from "@trigger.dev/react-hooks"
import { Bot, Loader2, Send } from "lucide-react"

import { useRoomChrome } from "@/components/editor/room-chrome-provider"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { useAiStatus } from "@/hooks/use-ai-status"
import { useChatFeed } from "@/hooks/use-chat-feed"
import { cn } from "@/lib/utils"
import type { designAgent } from "@/trigger/design-agent"

const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
]

function formatTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

interface PendingRun {
  runId: string
  publicToken: string
}

export function AiArchitectPanel() {
  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [pendingRun, setPendingRun] = useState<PendingRun | null>(null)
  const scrollEndRef = useRef<HTMLDivElement>(null)
  const { room } = useRoomChrome()
  const { isThinking, status } = useAiStatus()
  const { messages, sendMessage, sendAssistantMessage, sendError, currentUserId } = useChatFeed()

  // Project ID and Liveblocks room ID are the same string by construction
  // (07-wire-editor-home) — workspace-shell.tsx passes this same value as
  // both `CanvasRoom`'s `roomId` and `RoomHeaderSync`'s `projectId`.
  const roomId = room?.projectId

  // Tracks the design-agent run this panel itself triggered, via the same
  // runId/publicToken pair app/api/ai/design + app/api/ai/design/token
  // already return (22-design-agent-api) — independent of `isThinking`
  // (Presence-based, cleared by the task's own `finally` block), so the
  // final assistant message fires exactly once off the run's own terminal
  // status rather than a presence blip.
  const { run } = useRealtimeRun<typeof designAgent>(pendingRun?.runId, {
    // Without an explicit `id`, the hook keys its internal state (including
    // the ref that gates onComplete to fire "exactly once") off a stable
    // per-component useId() instead of the runId — so onComplete only ever
    // fires for the FIRST run this panel triggers per page load, and every
    // run after that completes (success or failure) with zero feedback:
    // confirmed live, a second failed run in the same session never posted
    // its "Sorry, I couldn't finish" message. Keying by runId gives each run
    // its own tracking state so onComplete fires every time.
    id: pendingRun?.runId,
    accessToken: pendingRun?.publicToken,
    enabled: Boolean(pendingRun),
    onComplete: (completedRun) => {
      void sendAssistantMessage(
        completedRun.isSuccess
          ? "I've updated the canvas based on your request."
          : "Sorry, I couldn't finish that request. Please try again."
      )
      setPendingRun(null)
    },
  })
  const isRunActive = Boolean(pendingRun) && !run?.isCompleted

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ block: "end" })
  }, [messages])

  // Only clears the textarea once the feed message actually lands — a
  // failed send leaves the draft in place (alongside the error state below)
  // so the user doesn't lose what they typed. After the human message is
  // in the feed, kicks off a design-agent run for that same prompt: POST
  // /api/ai/design (returns { runId }), then POST /api/ai/design/token
  // (owner-checked against that runId, returns a read-only public token) —
  // together these are the "{ runId, publicToken }" this chapter's spec
  // asks the submit flow to read, just split across the two routes
  // 22-design-agent-api already shipped rather than a new combined one
  // (this chapter's own scope limit is frontend-only, no backend changes).
  const submit = async (content: string) => {
    const trimmed = content.trim()
    if (isThinking || isRunActive || isSending || !trimmed || !roomId) return
    setIsSending(true)
    try {
      await sendMessage(trimmed)
      setInput("")

      const designResponse = await fetch("/api/ai/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed, roomId, projectId: roomId }),
      })
      if (!designResponse.ok) throw new Error("Failed to start design run")
      const { runId } = (await designResponse.json()) as { runId: string }

      const tokenResponse = await fetch("/api/ai/design/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      })
      if (!tokenResponse.ok) throw new Error("Failed to authorize run subscription")
      const { token } = (await tokenResponse.json()) as { token: string }

      setPendingRun({ runId, publicToken: token })
    } catch {
      void sendAssistantMessage("Sorry, I couldn't start that request. Please try again.")
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void submit(input)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <ScrollArea className="min-h-0 flex-1">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-2 py-6 text-center">
            <div className="flex size-10 items-center justify-center rounded-xl bg-accent-ai/10 text-accent-ai-text">
              <Bot className="size-5" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-foreground">
                Describe what you want to build
              </p>
              <p className="text-xs text-muted-foreground">
                The AI Architect turns a short prompt into a system design on your canvas.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void submit(prompt)}
                  className="rounded-full bg-accent-ai/10 px-3 py-1.5 text-xs font-medium text-accent-ai-text transition-colors hover:bg-accent-ai/20"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 px-1 py-1">
            {messages.map((message) => {
              const isOwn = message.data.senderId === currentUserId
              return (
                <div
                  key={message.id}
                  className={cn("flex max-w-[85%] flex-col gap-0.5", isOwn ? "ml-auto items-end" : "mr-auto items-start")}
                >
                  <span className="px-1 text-[0.65rem] font-medium text-muted-foreground">
                    {isOwn ? "You" : message.data.sender} · {formatTimestamp(message.data.timestamp)}
                  </span>
                  <div
                    className={cn(
                      "rounded-2xl px-3 py-2 text-sm",
                      isOwn
                        ? "border-2 border-accent-primary/50 bg-accent-primary/10 text-foreground"
                        : "border border-border bg-card text-foreground"
                    )}
                  >
                    {message.data.content}
                  </div>
                </div>
              )
            })}
            <div ref={scrollEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Room-shared "AI is working" state (hooks/use-ai-status.ts) — visible
          to everyone in the room since it's read off real Presence/Feed data,
          not local-only state. Only the message input and send button are
          disabled below; tabs, close, and the rest of the sidebar stay
          interactive. */}
      {isThinking && (
        <div
          aria-live="polite"
          className="flex items-center gap-2 rounded-full border border-accent-ai/30 bg-accent-ai/10 px-3 py-1.5 text-xs font-medium text-accent-ai-text"
        >
          <Loader2 className="size-3.5 shrink-0 animate-spin" />
          <span className="truncate">{status?.text || "Techno AI is working…"}</span>
        </div>
      )}

      {sendError && (
        <p role="alert" className="px-1 text-xs text-destructive">
          Couldn&apos;t send that message. Please try again.
        </p>
      )}

      <div className="flex items-end gap-2">
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message the room..."
          disabled={isThinking || isRunActive}
          className="min-h-[72px] max-h-[160px] flex-1 resize-none overflow-y-auto"
        />
        <Button
          type="button"
          size="icon"
          onClick={() => void submit(input)}
          disabled={!input.trim() || isThinking || isRunActive || isSending}
          aria-label="Send message"
          className="bg-accent-ai text-white hover:bg-accent-ai/90"
        >
          {isThinking || isRunActive || isSending ? <Loader2 className="animate-spin" /> : <Send />}
        </Button>
      </div>
    </div>
  )
}
