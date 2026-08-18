"use client"

import { useEffect, useRef, useState } from "react"
import type { KeyboardEvent } from "react"
import { Bot, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
]

let messageIdCounter = 0

function createMessageId() {
  messageIdCounter += 1
  return `msg-${Date.now()}-${messageIdCounter}`
}

export function AiArchitectPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const scrollEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ block: "end" })
  }, [messages])

  const sendMessage = (content: string) => {
    const trimmed = content.trim()
    if (!trimmed) return
    setMessages((current) => [
      ...current,
      { id: createMessageId(), role: "user", content: trimmed },
    ])
    setInput("")
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      sendMessage(input)
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
                  onClick={() => sendMessage(prompt)}
                  className="rounded-full bg-accent-ai/10 px-3 py-1.5 text-xs font-medium text-accent-ai-text transition-colors hover:bg-accent-ai/20"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 px-1 py-1">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                  message.role === "user"
                    ? "ml-auto border-2 border-accent-primary/50 bg-accent-primary/10 text-foreground"
                    : "mr-auto border border-border bg-card text-accent-ai-text"
                )}
              >
                {message.content}
              </div>
            ))}
            <div ref={scrollEndRef} />
          </div>
        )}
      </ScrollArea>

      <div className="flex items-end gap-2">
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe a system to design..."
          className="min-h-[72px] max-h-[160px] flex-1 resize-none overflow-y-auto"
        />
        <Button
          type="button"
          size="icon"
          onClick={() => sendMessage(input)}
          disabled={!input.trim()}
          aria-label="Send message"
          className="bg-accent-ai text-white hover:bg-accent-ai/90"
        >
          <Send />
        </Button>
      </div>
    </div>
  )
}
