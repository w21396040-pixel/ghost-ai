import { randomUUID } from "node:crypto"

import { AbortTaskRunError, logger, metadata, task } from "@trigger.dev/sdk"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { generateText } from "ai"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { saveSpecMarkdown } from "@/lib/spec-storage"
import { NODE_SHAPES } from "@/types/canvas"
import { chatMessageSchema, type ChatMessageData } from "@/types/tasks"

// Loosely-typed mirrors of types/canvas.ts's CanvasNode/CanvasEdge — kept
// local to this task rather than added to types/canvas.ts itself (27's scope
// limit: "do not change existing canvas or chat data models"). This is the
// task's own external-input boundary (payload arrives as untrusted Json, same
// reasoning types/tasks.ts's isTaskStatusMessage/chatMessageSchema already
// apply to feed data), not a redeclaration of the canvas model.
export const canvasNodeSchema = z
  .object({
    id: z.string().min(1),
    position: z.object({ x: z.number(), y: z.number() }),
    width: z.number().optional(),
    height: z.number().optional(),
    data: z.object({
      label: z.string(),
      color: z.string(),
      shape: z.enum(NODE_SHAPES),
    }),
  })
  .passthrough()

export const canvasEdgeSchema = z
  .object({
    id: z.string().min(1),
    source: z.string().min(1),
    target: z.string().min(1),
    data: z.object({ label: z.string() }).optional(),
  })
  .passthrough()

const generateSpecPayloadSchema = z.object({
  projectId: z.string().min(1),
  roomId: z.string().min(1),
  chatHistory: z.array(chatMessageSchema).default([]),
  nodes: z.array(canvasNodeSchema).default([]),
  edges: z.array(canvasEdgeSchema).default([]),
})

export type GenerateSpecPayload = z.infer<typeof generateSpecPayloadSchema>

function buildPrompt(
  nodes: GenerateSpecPayload["nodes"],
  edges: GenerateSpecPayload["edges"],
  chatHistory: ChatMessageData[]
) {
  const nodeSummary = nodes.length
    ? nodes
        .map((node) => `- id="${node.id}" shape=${node.data.shape} label="${node.data.label}"`)
        .join("\n")
    : "(empty canvas)"

  const edgeSummary = edges.length
    ? edges
        .map(
          (edge) =>
            `- ${edge.source} -> ${edge.target}${edge.data?.label ? ` label="${edge.data.label}"` : ""}`
        )
        .join("\n")
    : "(no connections)"

  const chatSummary = chatHistory.length
    ? chatHistory.map((message) => `${message.sender}: ${message.content}`).join("\n")
    : "(no conversation)"

  return `You are Ghost AI, writing a technical specification document for a system whose architecture was designed collaboratively on a canvas.

Canvas components:
${nodeSummary}

Canvas connections:
${edgeSummary}

Design conversation (for context on intent and decisions, not to be quoted verbatim):
${chatSummary}

Write a clear, well-organized Markdown technical specification for this system. Use proper Markdown headings and lists. Structure it with sections such as: Overview, Components, Data Flow, and Design Notes (only include Design Notes if the conversation surfaces a decision worth recording). Describe the system in prose grounded in the components and connections above — do not just restate the raw list. Return only the Markdown document, with no commentary before or after it.`
}

export const generateSpec = task({
  id: "generate-spec",
  run: async (payload: GenerateSpecPayload) => {
    const parsed = generateSpecPayloadSchema.safeParse(payload)
    if (!parsed.success) {
      throw new AbortTaskRunError(`Invalid generate-spec payload: ${parsed.error.message}`)
    }
    const { projectId, roomId, chatHistory, nodes, edges } = parsed.data

    metadata.set("status", "start")

    try {
      metadata.set("status", "processing")

      const apiKey = process.env.GOOGLE_AI_API_KEY
      if (!apiKey) {
        throw new Error("GOOGLE_AI_API_KEY is not set")
      }
      const google = createGoogleGenerativeAI({ apiKey })

      const { text } = await generateText({
        model: google("gemini-flash-latest"),
        temperature: 0.4,
        prompt: buildPrompt(nodes, edges, chatHistory),
        maxOutputTokens: 4096,
        // Same reasoning as trigger/design-agent.ts's identical setting:
        // this is direct prose generation from explicit instructions, not a
        // task that benefits from spending output-token budget on invisible
        // chain-of-thought.
        providerOptions: {
          google: {
            thinkingConfig: { thinkingBudget: 0 },
          },
        },
      })

      const spec = text.trim()

      // Persistence follows the same metadata + blob pattern
      // lib/canvas-storage.ts established for canvas snapshots: Prisma stores
      // only the blob reference, the Markdown content itself lives in Vercel
      // Blob (code-standards.md's "do not store large generated content
      // directly in the database"). The spec id is generated up front (not
      // left to Prisma's `@default(cuid())`) because the deterministic blob
      // path — specs/{projectId}/{specId}.md, per architecture-context.md's
      // Storage Model — needs the id before the row can be created.
      const specId = randomUUID()
      const filePath = await saveSpecMarkdown(projectId, specId, spec)
      await prisma.projectSpec.create({ data: { id: specId, projectId, filePath } })
      metadata.set("specId", specId)

      metadata.set("status", "complete")
      logger.info("generate-spec completed", { roomId, projectId, specId, length: spec.length })

      return spec
    } catch (error) {
      logger.error("generate-spec failed", {
        roomId,
        error: error instanceof Error ? error.message : String(error),
      })
      metadata.set("status", "error")
      throw error
    }
  },
})
