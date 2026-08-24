import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "@/app/generated/prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
  pgPool?: Pool
}

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set")
  }

  if (databaseUrl.startsWith("prisma+postgres://")) {
    return new PrismaClient({ accelerateUrl: databaseUrl })
  }

  const pool = globalForPrisma.pgPool ?? new Pool({ 
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5_000
  })
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pgPool = pool
  }

  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

let cachedClient: PrismaClient | undefined

function getPrismaClient(): PrismaClient {
  if (process.env.NODE_ENV !== "production") {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient()
    }
    return globalForPrisma.prisma
  }

  if (!cachedClient) {
    cachedClient = createPrismaClient()
  }
  return cachedClient
}

// Constructed lazily on first use instead of at module load, so importing
// this module (e.g. during Next.js's build-time route data collection)
// doesn't require DATABASE_URL to be present.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getPrismaClient() as object, prop, receiver)
  },
})
