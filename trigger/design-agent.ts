import { AbortTaskRunError, logger, task } from "@trigger.dev/sdk"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { generateObject, jsonSchema } from "ai"
// The server-side counterpart of the same `useLiveblocksFlow` hook
// `components/editor/canvas.tsx` uses — reads/writes the identical "flow"
// Storage key (nodes/edges LiveMaps) from outside React, which is what makes
// this the "existing collaborative flow utility" rather than a new one.
import { mutateFlow, type MutableFlow } from "@liveblocks/react-flow/node"
import { LiveblocksError } from "@liveblocks/node"

import { getLiveblocksClient } from "@/lib/liveblocks"
import {
  EDGE_COLOR,
  MIN_NODE_HEIGHT,
  MIN_NODE_WIDTH,
  NODE_COLORS,
  NODE_SHAPES,
  NODE_SHAPE_SIZES,
  type CanvasEdge,
  type CanvasNode,
  type NodeShape,
} from "@/types/canvas"
import { AI_AGENT_NAME, AI_AGENT_USER_ID, AI_STATUS_FEED_ID, type TaskStatus } from "@/types/tasks"

type LiveblocksClient = ReturnType<typeof getLiveblocksClient>

// ui-context.md's --accent-ai-text — reuses the app's existing AI-branded
// color rather than inventing a new one, same reasoning ai-architect-panel.tsx
// already applied to AI-owned UI.
const AI_AGENT_COLOR = "#8b82ff"

// Matches the horizontal/vertical spacing the starter templates
// (components/editor/starter-templates.ts) already use between columns and
// stacked nodes, so AI-generated layouts read like the rest of the app.
const COLUMN_WIDTH = 280
const ROW_GAP = 60

type DesignActionType =
  | "addNode"
  | "moveNode"
  | "resizeNode"
  | "updateNodeData"
  | "deleteNode"
  | "addEdge"
  | "deleteEdge"

const ACTION_TYPES = new Set<DesignActionType>([
  "addNode",
  "moveNode",
  "resizeNode",
  "updateNodeData",
  "deleteNode",
  "addEdge",
  "deleteEdge",
])

// A single flattened action shape (rather than a discriminated union) since
// Gemini's structured output works most reliably against one flat object per
// array item. `shape`/`type` are kept as plain strings here, not the
// narrower app types, because this is model output — an external input
// boundary that needs validating before it's trusted (code-standards.md).
interface DesignAction {
  type: string
  id: string
  shape?: string
  label?: string
  colorIndex?: number
  x?: number
  y?: number
  width?: number
  height?: number
  source?: string
  target?: string
}

interface DesignPlan {
  actions: DesignAction[]
}

const designPlanSchema = jsonSchema<DesignPlan>({
  type: "object",
  properties: {
    actions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: [...ACTION_TYPES] },
          id: { type: "string" },
          shape: { type: "string", enum: [...NODE_SHAPES] },
          // minLength, not just `required`, because `required` only forces
          // the key to be present — the model was satisfying that by writing
          // "label": "" (confirmed live: 8/9 edges came back exactly this
          // way even after label became required). A minLength constraint is
          // enforced by Gemini's own constrained decoding, so it can't
          // produce an empty string here at all.
          label: { type: "string", minLength: 1 },
          colorIndex: { type: "integer", minimum: 0, maximum: NODE_COLORS.length - 1 },
          x: { type: "number" },
          y: { type: "number" },
          width: { type: "number" },
          height: { type: "number" },
          source: { type: "string" },
          target: { type: "string" },
        },
        // "label" is required (not just id/type) on every action, addEdge
        // included — left optional, the model reliably fills it in for the
        // first item or two of a long plan and then quietly omits it for the
        // rest (confirmed live: 8/9 edges came back with an empty label and
        // 9/10 nodes came back with no colorIndex on a real run). Harmless
        // for action types that don't use a label (moveNode, deleteNode,
        // etc.) — applyAction below just ignores it there.
        required: ["type", "id", "label"],
      },
    },
  },
  required: ["actions"],
})

// Caps a single plan so a malformed/runaway model response can't turn into
// hundreds of sequential Liveblocks REST calls.
const MAX_ACTIONS = 80

function isNodeShape(value: string | undefined): value is NodeShape {
  return !!value && (NODE_SHAPES as readonly string[]).includes(value)
}

// colorIndex is optional in the schema (unlike label, it doesn't have a
// generic per-type meaning — moveNode/deleteNode have no use for it) and the
// model skips it about as often as it used to skip label. Rather than
// collapsing every node with no colorIndex to the same flat gray
// (DEFAULT_NODE_COLOR), fall back to a color keyed by the node's own shape —
// shape already carries function (cylinder = datastore, hexagon = gateway,
// diamond = queue, circle = external actor, rectangle = service), so this
// keeps functionally-different nodes visually distinct even when the model
// never names a color.
const SHAPE_FALLBACK_COLOR_INDEX: Record<NodeShape, number> = {
  circle: 4,
  hexagon: 2,
  rectangle: 1,
  diamond: 3,
  cylinder: 6,
  pill: 6,
}

function resolveColor(colorIndex: number | undefined, shape: NodeShape) {
  if (typeof colorIndex === "number" && NODE_COLORS[colorIndex]) {
    return NODE_COLORS[colorIndex]
  }
  return NODE_COLORS[SHAPE_FALLBACK_COLOR_INDEX[shape]]
}

function buildPrompt(userPrompt: string, existingNodes: CanvasNode[], existingEdges: CanvasEdge[]) {
  const existingNodeSummary = existingNodes.length
    ? existingNodes
        .map(
          (node) =>
            `- id="${node.id}" shape=${node.data.shape} label="${node.data.label}" position=(${node.position.x}, ${node.position.y})`
        )
        .join("\n")
    : "(empty canvas)"

  const existingEdgeSummary = existingEdges.length
    ? existingEdges
        .map((edge) => `- id="${edge.id}" ${edge.source} -> ${edge.target}${edge.data?.label ? ` label="${edge.data.label}"` : ""}`)
        .join("\n")
    : "(no edges)"

  return `You are Techno AI, a system-design assistant that edits a collaborative architecture diagram in place.

Existing nodes on the canvas:
${existingNodeSummary}

Existing edges on the canvas:
${existingEdgeSummary}

User request: "${userPrompt}"

Produce a plan of canvas actions that satisfies the request.

Rules:
- To add a node, use "addNode" with: a short unique kebab-case "id" (never reuse an existing id unless you intend to edit that exact node), "shape" (one of: ${NODE_SHAPES.join(", ")}), a short specific "label" (e.g. "Auth Service", not a sentence), and "colorIndex" (0-${NODE_COLORS.length - 1}).
- EVERY addNode action must include colorIndex — never leave it out, including for the 5th, 10th, or last node in the plan. Use it to group nodes by function, not decoration: pick one colorIndex for entry points/gateways, a different one for each distinct backend service (or one shared colorIndex if the services are peers), a different one for datastores/caches, and a different one for messaging/queues. Two nodes that play different roles in the system should not share a colorIndex just because they're both rectangles.
- Do not set "x"/"y" on "addNode" — layout position is computed automatically.
- To connect nodes, use "addEdge" with "id", "source", "target", and "label". Only reference node ids that already exist or that you are adding in this same plan.
- EVERY addEdge action must include a specific, non-empty "label" naming the action or data crossing that connection — never an empty string, never a placeholder. Write it as a short verb phrase from the source's point of view (e.g. "Verify User", "Cache Miss", "Place Order", "Publish Event"), not the target node's name repeated.
- EVERY action (including moveNode, resizeNode, deleteNode, deleteEdge) must include a non-empty "label" field per the schema even when it doesn't change anything on screen for that action type — reuse the target node/edge's own existing label or id there, never an empty string.
- Only use "moveNode" (id, x, y), "resizeNode" (id, width, height), "updateNodeData" (id, label and/or colorIndex), "deleteNode" (id), or "deleteEdge" (id) to change something that already exists on the canvas.
- If the canvas is empty and the request describes a whole system, generate a complete, sensible architecture (typically 5-12 nodes).
- If the canvas already has content, extend or modify it rather than starting over, unless the user clearly asks to replace it.`
}

async function readCanvasSnapshot(client: LiveblocksClient, roomId: string) {
  let nodes: CanvasNode[] = []
  let edges: CanvasEdge[] = []
  await mutateFlow<CanvasNode, CanvasEdge>({ client, roomId }, (flow) => {
    nodes = [...flow.nodes]
    edges = [...flow.edges]
  })
  return { nodes, edges }
}

// Longest-path layering over the edges connecting newly-added nodes, so
// generated designs land in a readable left-to-right, non-overlapping grid
// instead of relying on the model to reason about 2D coordinates. New
// content is offset to the right of anything already on the canvas.
function computeLayout(
  addNodeActions: DesignAction[],
  addEdgeActions: DesignAction[],
  existingNodes: CanvasNode[]
): Map<string, { x: number; y: number }> {
  const ids = addNodeActions.map((action) => action.id)
  const idSet = new Set(ids)

  const incoming = new Map<string, Set<string>>()
  for (const id of ids) incoming.set(id, new Set())
  for (const edge of addEdgeActions) {
    if (edge.source && edge.target && idSet.has(edge.source) && idSet.has(edge.target)) {
      incoming.get(edge.target)?.add(edge.source)
    }
  }

  const rank = new Map<string, number>()
  const resolved = new Set<string>()
  // Bounded by ids.length so a cycle among new nodes can't spin forever —
  // anything still unresolved after that many passes just falls back to
  // rank 0 below.
  for (let pass = 0; pass < ids.length && resolved.size < ids.length; pass++) {
    for (const id of ids) {
      if (resolved.has(id)) continue
      const preds = incoming.get(id) ?? new Set()
      const blocked = [...preds].some((pred) => idSet.has(pred) && !resolved.has(pred))
      if (blocked) continue
      const maxPredRank = Math.max(-1, ...[...preds].map((pred) => rank.get(pred) ?? 0))
      rank.set(id, maxPredRank + 1)
      resolved.add(id)
    }
  }
  for (const id of ids) {
    if (!rank.has(id)) rank.set(id, 0)
  }

  const columns = new Map<number, string[]>()
  for (const id of ids) {
    const r = rank.get(id) ?? 0
    if (!columns.has(r)) columns.set(r, [])
    columns.get(r)!.push(id)
  }

  const existingMaxX = existingNodes.reduce(
    (max, node) => Math.max(max, node.position.x + (node.width ?? NODE_SHAPE_SIZES.rectangle.width)),
    -COLUMN_WIDTH
  )
  const baseX = existingMaxX + COLUMN_WIDTH
  const baseY = existingNodes.length > 0 ? Math.min(...existingNodes.map((node) => node.position.y)) : 0

  const shapeById = new Map(addNodeActions.map((action) => [action.id, action.shape]))
  const positions = new Map<string, { x: number; y: number }>()

  for (const [r, columnIds] of columns) {
    let y = baseY
    for (const id of columnIds) {
      const shape = isNodeShape(shapeById.get(id)) ? (shapeById.get(id) as NodeShape) : "rectangle"
      const { height } = NODE_SHAPE_SIZES[shape]
      positions.set(id, { x: baseX + r * COLUMN_WIDTH, y })
      y += height + ROW_GAP
    }
  }

  return positions
}

function resolveCursor(
  action: DesignAction,
  positions: Map<string, { x: number; y: number }>
): { x: number; y: number } | null {
  const generated = positions.get(action.id)
  if (generated) return generated
  if (typeof action.x === "number" && typeof action.y === "number") {
    return { x: action.x, y: action.y }
  }
  return null
}

function applyAction(
  flow: MutableFlow<CanvasNode, CanvasEdge>,
  action: DesignAction,
  positions: Map<string, { x: number; y: number }>
) {
  switch (action.type) {
    case "addNode": {
      const shape = isNodeShape(action.shape) ? action.shape : "rectangle"
      const { width, height } = NODE_SHAPE_SIZES[shape]
      const color = resolveColor(action.colorIndex, shape)
      const position = positions.get(action.id) ?? { x: 0, y: 0 }
      flow.addNode({
        id: action.id,
        type: "canvasNode",
        position,
        width,
        height,
        data: { label: action.label?.trim() || "Untitled", color: color.fill, shape },
      })
      return
    }
    case "moveNode": {
      if (typeof action.x !== "number" || typeof action.y !== "number") return
      flow.updateNode(action.id, { position: { x: action.x, y: action.y } })
      return
    }
    case "resizeNode": {
      if (typeof action.width !== "number" || typeof action.height !== "number") return
      flow.updateNode(action.id, {
        width: Math.max(MIN_NODE_WIDTH, action.width),
        height: Math.max(MIN_NODE_HEIGHT, action.height),
      })
      return
    }
    case "updateNodeData": {
      flow.updateNodeData(action.id, (data) => ({
        ...data,
        ...(action.label !== undefined ? { label: action.label } : {}),
        ...(action.colorIndex !== undefined
          ? { color: resolveColor(action.colorIndex, data.shape).fill }
          : {}),
      }))
      return
    }
    case "deleteNode": {
      flow.removeNode(action.id)
      return
    }
    case "addEdge": {
      if (!action.source || !action.target) return
      if (!flow.getNode(action.source) || !flow.getNode(action.target)) return
      flow.addEdge({
        id: action.id,
        type: "canvasEdge",
        source: action.source,
        target: action.target,
        sourceHandle: "right",
        targetHandle: "left",
        markerEnd: { type: "arrowclosed", color: EDGE_COLOR, width: 16, height: 16 },
        data: { label: action.label ?? "" },
      })
      return
    }
    case "deleteEdge": {
      flow.removeEdge(action.id)
      return
    }
  }
}

// Applied one action at a time (each its own mutateFlow commit) rather than
// as one big batch, so collaborators see the design build up incrementally
// and the AI's cursor visibly moves node-to-node while it works — not one
// instant paste at the end.
async function applyActions(
  client: LiveblocksClient,
  roomId: string,
  actions: DesignAction[],
  positions: Map<string, { x: number; y: number }>
) {
  for (const action of actions) {
    await client.setPresence(roomId, {
      userId: AI_AGENT_USER_ID,
      data: { cursor: resolveCursor(action, positions), thinking: true },
      userInfo: { name: AI_AGENT_NAME, avatar: "", color: AI_AGENT_COLOR },
      ttl: 90,
    })

    await mutateFlow<CanvasNode, CanvasEdge>({ client, roomId }, (flow) => {
      applyAction(flow, action, positions)
    })
  }
}

// Publishes to the shared "ai-status-feed" Feed rather than a broadcastEvent
// — a Feed's messages persist and are fetched on subscribe (useFeedMessages),
// so a client that opens the sidebar mid-run, or after the run has already
// finished, still sees the latest status; a transient broadcastEvent only
// reaches clients that happen to already be listening.
async function ensureStatusFeed(client: LiveblocksClient, roomId: string) {
  try {
    await client.createFeed({ roomId, feedId: AI_STATUS_FEED_ID })
  } catch (error) {
    // 409 means the feed already exists — every other run against this room
    // hits this same path, same idempotent-creation shape
    // /api/liveblocks-auth's getOrCreateRoom already established.
    if (!(error instanceof LiveblocksError) || error.status !== 409) {
      throw error
    }
  }
}

function publishStatus(client: LiveblocksClient, roomId: string, status: TaskStatus, text: string) {
  return client.createFeedMessage({ roomId, feedId: AI_STATUS_FEED_ID, data: { status, text } })
}

function clearPresence(client: LiveblocksClient, roomId: string) {
  return client.setPresence(roomId, {
    userId: AI_AGENT_USER_ID,
    data: { cursor: null, thinking: false },
    userInfo: { name: AI_AGENT_NAME, avatar: "", color: AI_AGENT_COLOR },
    ttl: 5,
  })
}

export const designAgent = task({
  id: "design-agent",
  run: async (payload: { prompt: string; roomId: string }) => {
    const prompt = payload.prompt?.trim()
    const roomId = payload.roomId

    if (!prompt || !roomId) {
      throw new AbortTaskRunError("prompt and roomId are required")
    }

    const client = getLiveblocksClient()

    try {
      await ensureStatusFeed(client, roomId)
      await publishStatus(client, roomId, "start", "Techno AI is reading your prompt…")
      await client.setPresence(roomId, {
        userId: AI_AGENT_USER_ID,
        data: { cursor: null, thinking: true },
        userInfo: { name: AI_AGENT_NAME, avatar: "", color: AI_AGENT_COLOR },
        ttl: 90,
      })

      const { nodes: existingNodes, edges: existingEdges } = await readCanvasSnapshot(client, roomId)

      await publishStatus(client, roomId, "processing", "Techno AI is designing the architecture…")

      const apiKey = process.env.GOOGLE_AI_API_KEY
      if (!apiKey) {
        throw new Error("GOOGLE_AI_API_KEY is not set")
      }
      const google = createGoogleGenerativeAI({ apiKey })

      const { object } = await generateObject({
        model: google("gemini-flash-latest"),
        schema: designPlanSchema,
        temperature: 0.4,
        prompt: buildPrompt(prompt, existingNodes, existingEdges),
        maxOutputTokens: 4096,
        // This is deterministic structured-output generation (fill a JSON
        // schema from explicit rules), not a task that benefits from
        // chain-of-thought — left at its default, Gemini's "thinking" burns
        // most of the output token budget on invisible reasoning and starves
        // the actual plan (confirmed live: 583 reasoning tokens vs 84 text
        // tokens, yielding a single malformed action for a real multi-part
        // prompt). Disabling it fixes both correctness and latency (~58s -> ~3s).
        providerOptions: {
          google: {
            thinkingConfig: { thinkingBudget: 0 },
          },
        },
      })

      const actions = object.actions.filter((action) => ACTION_TYPES.has(action.type as DesignActionType) && action.id.trim()).slice(0, MAX_ACTIONS)
      const addNodeActions = actions.filter((action) => action.type === "addNode")
      const addEdgeActions = actions.filter((action) => action.type === "addEdge")
      const otherActions = actions.filter((action) => action.type !== "addNode")
      const positions = computeLayout(addNodeActions, addEdgeActions, existingNodes)

      // All node creation lands first (so every addEdge below can rely on
      // its endpoints already existing), then everything else in the order
      // the model produced it.
      await applyActions(client, roomId, [...addNodeActions, ...otherActions], positions)

      await publishStatus(client, roomId, "complete", "Techno AI finished updating the design.")
      logger.info("design-agent completed", { roomId, actionCount: actions.length })
    } catch (error) {
      logger.error("design-agent failed", {
        roomId,
        error: error instanceof Error ? error.message : String(error),
      })
      await publishStatus(client, roomId, "error", "Techno AI couldn't finish that request. Please try again.").catch(
        () => {}
      )
      throw error
    } finally {
      await clearPresence(client, roomId).catch(() => {})
    }
  },
})
