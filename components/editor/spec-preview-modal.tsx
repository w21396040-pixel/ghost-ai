"use client"

import { Download, Loader2 } from "lucide-react"
import ReactMarkdown from "react-markdown"
import type { Components } from "react-markdown"
import { createElement } from "react"
import type { JSX } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useSpecPreview } from "@/hooks/use-spec-preview"

interface SpecPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  specId: string | null
  filename: string
  createdAt: string
}

// No typography plugin in this project (rg confirmed) — mapping each
// Markdown element to the same shadcn tokens the rest of the app uses
// (text-foreground/text-muted-foreground/border-border) rather than adding
// @tailwindcss/typography for one modal. `markdownTag` strips react-markdown's
// injected `node` prop once here instead of twelve individual destructures
// that would each need silencing for @typescript-eslint/no-unused-vars.
// createElement (not JSX) because a generic `Tag` isn't statically resolvable
// as a JSX intrinsic — the same reason polymorphic-tag helpers in TS reach
// for createElement over `<Tag />`.
function markdownTag<Tag extends keyof JSX.IntrinsicElements>(Tag: Tag, className: string) {
  return function MarkdownTag({
    node: _node,
    ...props
  }: JSX.IntrinsicElements[Tag] & { node?: unknown }) {
    void _node
    return createElement(Tag, { className, ...props })
  }
}

const markdownComponents: Components = {
  h1: markdownTag("h1", "font-heading text-lg font-semibold text-foreground"),
  h2: markdownTag("h2", "font-heading mt-4 text-base font-semibold text-foreground"),
  h3: markdownTag("h3", "mt-3 text-sm font-semibold text-foreground"),
  p: markdownTag("p", "text-sm leading-relaxed text-foreground"),
  ul: markdownTag("ul", "list-disc space-y-1 pl-5 text-sm text-foreground"),
  ol: markdownTag("ol", "list-decimal space-y-1 pl-5 text-sm text-foreground"),
  li: markdownTag("li", "leading-relaxed"),
  code: markdownTag("code", "rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"),
  pre: markdownTag(
    "pre",
    "overflow-x-auto rounded-lg border border-border bg-muted p-3 text-xs text-foreground"
  ),
  blockquote: markdownTag(
    "blockquote",
    "border-l-2 border-border pl-3 text-sm text-muted-foreground italic"
  ),
  a: markdownTag("a", "text-accent-primary underline underline-offset-2"),
  strong: markdownTag("strong", "font-semibold text-foreground"),
}

export function SpecPreviewModal({
  isOpen,
  onClose,
  projectId,
  specId,
  filename,
  createdAt,
}: SpecPreviewModalProps) {
  const { content, error, isLoading } = useSpecPreview(projectId, specId, isOpen)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[80vh] flex-col gap-4 rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="truncate">{filename}</DialogTitle>
          <DialogDescription>
            Generated {new Date(createdAt).toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1 rounded-2xl border border-border bg-card p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="py-10 text-center text-sm text-destructive">{error}</p>
          ) : (
            <div className="flex flex-col gap-2">
              <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
            </div>
          )}
        </ScrollArea>

        {specId && (
          <Button asChild variant="outline" className="w-full">
            <a href={`/api/projects/${projectId}/specs/${specId}/download`} download>
              <Download />
              Download
            </a>
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
