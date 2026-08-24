"use client"

import { useState } from "react"
import { useRealtimeRun } from "@trigger.dev/react-hooks"
import { useLiveblocksFlow } from "@liveblocks/react-flow"
import { Download, FileText, Loader2, Sparkles } from "lucide-react"

import { useRoomChrome } from "@/components/editor/room-chrome-provider"
import { SpecPreviewModal } from "@/components/editor/spec-preview-modal"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useChatFeed } from "@/hooks/use-chat-feed"
import { useProjectSpecs } from "@/hooks/use-project-specs"
import type { CanvasEdge, CanvasNode } from "@/types/canvas"
import type { generateSpec } from "@/trigger/generate-spec"

function formatDate(createdAt: string) {
  return new Date(createdAt).toLocaleDateString([], { month: "short", day: "numeric" })
}

interface PendingRun {
  runId: string
  publicToken: string
}

export function SpecsPanel() {
  const { room } = useRoomChrome()
  const projectId = room?.projectId
  const { specs, isLoading, refresh } = useProjectSpecs(projectId)
  const [previewSpecId, setPreviewSpecId] = useState<string | null>(null)

  const { messages } = useChatFeed()
  // `useLiveblocksFlow` only depends on Liveblocks Storage, not on
  // `@xyflow/react`'s own context — safe to call here even though
  // SpecsPanel sits outside the canvas's ReactFlowProvider (it's a sibling
  // of Canvas, both under the same RoomProvider — see workspace-shell.tsx).
  const { nodes, edges, isLoading: isFlowLoading } = useLiveblocksFlow<CanvasNode, CanvasEdge>()

  const [pendingRun, setPendingRun] = useState<PendingRun | null>(null)
  const [isTriggering, setIsTriggering] = useState(false)
  const [generateError, setGenerateError] = useState(false)

  const { run } = useRealtimeRun<typeof generateSpec>(pendingRun?.runId, {
    // Same reasoning as ai-architect-panel.tsx's identical `id` option: keys
    // this hook's internal onComplete-gating state off the runId itself
    // rather than a per-component useId(), so onComplete fires for every
    // run this panel triggers, not just the first one per page load.
    id: pendingRun?.runId,
    accessToken: pendingRun?.publicToken,
    enabled: Boolean(pendingRun),
    onComplete: (completedRun) => {
      setPendingRun(null)
      if (completedRun.isSuccess) {
        refresh()
      } else {
        setGenerateError(true)
      }
    },
  })
  const isRunActive = Boolean(pendingRun) && !run?.isCompleted
  const isGenerating = isTriggering || isRunActive

  const previewSpec = specs.find((spec) => spec.id === previewSpecId) ?? null

  const handleGenerate = async () => {
    if (!projectId || isGenerating || isFlowLoading) return
    setGenerateError(false)
    setIsTriggering(true)
    try {
      const specResponse = await fetch("/api/ai/spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: projectId,
          chatHistory: messages.map((message) => message.data),
          nodes: nodes ?? [],
          edges: edges ?? [],
        }),
      })
      if (!specResponse.ok) throw new Error("Failed to start spec generation")
      const { runId } = (await specResponse.json()) as { runId: string }

      const tokenResponse = await fetch("/api/ai/spec/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      })
      if (!tokenResponse.ok) throw new Error("Failed to authorize run subscription")
      const { token } = (await tokenResponse.json()) as { token: string }

      setPendingRun({ runId, publicToken: token })
    } catch {
      setGenerateError(true)
    } finally {
      setIsTriggering(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <Button
        type="button"
        className="w-full bg-accent-ai text-white hover:bg-accent-ai/90"
        onClick={() => void handleGenerate()}
        disabled={!projectId || isGenerating || isFlowLoading}
      >
        {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles />}
        {isGenerating ? "Generating…" : "Generate Spec"}
      </Button>

      {generateError && (
        <p role="alert" className="px-1 text-xs text-destructive">
          Couldn&apos;t generate a spec. Please try again.
        </p>
      )}

      <ScrollArea className="min-h-0 flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : specs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <div className="flex size-10 items-center justify-center rounded-xl bg-accent-ai/10 text-accent-ai-text">
              <FileText className="size-5" />
            </div>
            <p className="text-sm font-medium text-foreground">No specs yet</p>
            <p className="px-4 text-xs text-muted-foreground">
              Generate a spec to turn your canvas into a written system design.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 pr-1">
            {specs.map((spec) => (
              <div
                key={spec.id}
                role="button"
                tabIndex={0}
                onClick={() => setPreviewSpecId(spec.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    setPreviewSpecId(spec.id)
                  }
                }}
                className="flex items-center gap-2.5 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-ai/10 text-accent-ai-text">
                  <FileText className="size-4" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium text-foreground">
                    {spec.filename}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(spec.createdAt)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  asChild
                  onClick={(event) => event.stopPropagation()}
                  aria-label={`Download ${spec.filename}`}
                >
                  <a
                    href={`/api/projects/${projectId}/specs/${spec.id}/download`}
                    download
                  >
                    <Download />
                  </a>
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {projectId && (
        <SpecPreviewModal
          isOpen={previewSpec !== null}
          onClose={() => setPreviewSpecId(null)}
          projectId={projectId}
          specId={previewSpec?.id ?? null}
          filename={previewSpec?.filename ?? ""}
          createdAt={previewSpec?.createdAt ?? ""}
        />
      )}
    </div>
  )
}
