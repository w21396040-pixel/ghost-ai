import { Position } from "@xyflow/react"

import {
  NODE_COLORS,
  NODE_SHAPE_SIZES,
  type CanvasEdge,
  type CanvasNode,
  type NodeShape,
} from "@/types/canvas"

export interface CanvasTemplate {
  id: string
  name: string
  description: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

// Named aliases into the shared NODE_COLORS palette (types/canvas.ts) so the
// template definitions below read by intent ("blue", "teal") instead of by
// array index.
const COLOR = {
  neutral: NODE_COLORS[0],
  blue: NODE_COLORS[1],
  purple: NODE_COLORS[2],
  orange: NODE_COLORS[3],
  red: NODE_COLORS[4],
  pink: NODE_COLORS[5],
  green: NODE_COLORS[6],
  teal: NODE_COLORS[7],
} as const

function templateNode(
  id: string,
  shape: NodeShape,
  label: string,
  color: (typeof NODE_COLORS)[number],
  x: number,
  y: number
): CanvasNode {
  const { width, height } = NODE_SHAPE_SIZES[shape]
  return {
    id,
    type: "canvasNode",
    position: { x, y },
    width,
    height,
    data: { label, color: color.fill, shape },
  }
}

// Defaults to a left-to-right connection (right side of source to left side
// of target) so linear/fan-out layouts read cleanly; pass overrides for
// vertical or converging connections.
function templateEdge(
  id: string,
  source: string,
  target: string,
  options: { sourceHandle?: Position; targetHandle?: Position; label?: string } = {}
): CanvasEdge {
  return {
    id,
    type: "canvasEdge",
    source,
    target,
    sourceHandle: options.sourceHandle ?? Position.Right,
    targetHandle: options.targetHandle ?? Position.Left,
    data: { label: options.label ?? "" },
  }
}

const microservicesTemplate: CanvasTemplate = {
  id: "microservices",
  name: "Microservices",
  description:
    "API Gateway routes traffic to isolated services, each backed by a dedicated database and connected via a shared message bus.",
  nodes: [
    templateNode("client", "pill", "Client", COLOR.blue, 0, 240),
    templateNode("gateway", "rectangle", "API Gateway", COLOR.teal, 260, 228),
    templateNode("bus", "hexagon", "Message Bus", COLOR.purple, 260, 460),
    templateNode("service-a", "rectangle", "Service A", COLOR.purple, 580, 0),
    templateNode("service-b", "rectangle", "Service B", COLOR.purple, 580, 160),
    templateNode("service-c", "rectangle", "Service C", COLOR.purple, 580, 320),
    templateNode("service-d", "rectangle", "Service D", COLOR.purple, 580, 480),
    templateNode("db-a", "rectangle", "Database A", COLOR.neutral, 900, 0),
    templateNode("db-b", "rectangle", "Database B", COLOR.neutral, 900, 160),
    templateNode("db-c", "rectangle", "Database C", COLOR.neutral, 900, 320),
    templateNode("db-d", "rectangle", "Database D", COLOR.neutral, 900, 480),
  ],
  edges: [
    templateEdge("client-gateway", "client", "gateway"),
    templateEdge("gateway-service-a", "gateway", "service-a"),
    templateEdge("gateway-service-b", "gateway", "service-b"),
    templateEdge("gateway-service-c", "gateway", "service-c"),
    templateEdge("gateway-service-d", "gateway", "service-d"),
    templateEdge("bus-service-a", "bus", "service-a"),
    templateEdge("bus-service-b", "bus", "service-b"),
    templateEdge("bus-service-c", "bus", "service-c"),
    templateEdge("bus-service-d", "bus", "service-d"),
    templateEdge("service-a-db-a", "service-a", "db-a"),
    templateEdge("service-b-db-b", "service-b", "db-b"),
    templateEdge("service-c-db-c", "service-c", "db-c"),
    templateEdge("service-d-db-d", "service-d", "db-d"),
  ],
}

const cicdPipelineTemplate: CanvasTemplate = {
  id: "cicd-pipeline",
  name: "CI/CD Pipeline",
  description:
    "End-to-end delivery from source commit through build, test, containerisation, and staged deployment to production.",
  nodes: [
    templateNode("commit", "circle", "Commit", COLOR.neutral, 0, 30),
    templateNode("build", "rectangle", "Build", COLOR.blue, 260, 40),
    templateNode("test", "rectangle", "Test", COLOR.purple, 560, 40),
    templateNode("containerize", "rectangle", "Containerise", COLOR.teal, 860, 40),
    templateNode("staging", "diamond", "Staging", COLOR.orange, 1160, 10),
    templateNode("approval", "diamond", "Approval Gate", COLOR.red, 1420, 10),
    templateNode("production", "pill", "Production", COLOR.green, 1720, 52),
  ],
  edges: [
    templateEdge("commit-build", "commit", "build"),
    templateEdge("build-test", "build", "test"),
    templateEdge("test-containerize", "test", "containerize"),
    templateEdge("containerize-staging", "containerize", "staging"),
    templateEdge("staging-approval", "staging", "approval"),
    templateEdge("approval-production", "approval", "production"),
  ],
}

const eventDrivenTemplate: CanvasTemplate = {
  id: "event-driven",
  name: "Event-Driven System",
  description:
    "Producers publish events to a central bus. Independent consumers handle emails, push notifications, analytics, and error queues.",
  nodes: [
    templateNode("producer-a", "pill", "Producer A", COLOR.blue, 0, 100),
    templateNode("producer-b", "pill", "Producer B", COLOR.blue, 0, 280),
    templateNode("bus", "hexagon", "Event Bus", COLOR.purple, 320, 168),
    templateNode("consumer-email", "rectangle", "Email Consumer", COLOR.pink, 640, 0),
    templateNode("consumer-push", "rectangle", "Push Notifications", COLOR.teal, 640, 140),
    templateNode("consumer-analytics", "rectangle", "Analytics Consumer", COLOR.orange, 640, 280),
    templateNode("consumer-error", "rectangle", "Error Queue", COLOR.red, 640, 420),
  ],
  edges: [
    templateEdge("producer-a-bus", "producer-a", "bus"),
    templateEdge("producer-b-bus", "producer-b", "bus"),
    templateEdge("bus-email", "bus", "consumer-email"),
    templateEdge("bus-push", "bus", "consumer-push"),
    templateEdge("bus-analytics", "bus", "consumer-analytics"),
    templateEdge("bus-error", "bus", "consumer-error"),
  ],
}

export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  microservicesTemplate,
  cicdPipelineTemplate,
  eventDrivenTemplate,
]
