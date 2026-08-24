---
name: prisma-postgres-setup
description: Set up a new Prisma Postgres database and connect it to a local project using the Management API. Use when asked to "set up a database", "create a Prisma Postgres project", "get a connection string", "connect my app to Prisma Postgres", or "provision a database".
license: MIT
metadata:
  author: prisma
  version: "1.1.0"
---

# Prisma Postgres Setup

Procedural skill that guides you through provisioning a new Prisma Postgres database via the Management API and connecting it to a local project.

## When to Apply

Use this skill when:

- Setting up a new Prisma Postgres database for a project
- Creating a Prisma Postgres project and connecting it locally
- Obtaining a connection string for Prisma Postgres
- Provisioning a database via the Management API (not the Console UI)

Do **not** use this skill when:

- Setting up CI/CD preview databases — use `prisma-postgres-cicd`
- Building multi-tenant database provisioning into an app — use `prisma-postgres-integrator`
- Working with a database that already exists and is connected (schema/migration tasks are standard Prisma CLI)

## Prerequisites

- Node.js 20.19.0 or newer
- A Prisma Postgres workspace (create one at https://console.prisma.io if needed)
- A workspace service token (see `references/auth.md`)

## UX Guidelines

When presenting choices to the user (region selection, project deletion, etc.), **use your platform's interactive selection mechanism** (e.g., `ask` tool in Claude Code, structured prompts in other agents). Do not print static tables and ask the user to type a value — present selectable options so the user can pick with minimal effort.

## Workflow

Follow these steps in order. Each step includes the API call to make and how to handle the response.

### Step 1: Authenticate

You need a service token. Try these methods in order:

**1a. Token in the user's prompt**

Check if the user included a service token in their initial message (e.g., "Set up Prisma Postgres with token eyJ..."). If so, assign it to `PRISMA_SERVICE_TOKEN` **exactly as provided** — do not truncate, re-encode, or round-trip it through a file — and reuse that same variable for every API call in this workflow, through the final request in Step 4.

**1b. Token in the environment**

Check for `PRISMA_SERVICE_TOKEN` in the environment or `.env` file.

**1c. Ask the user to create one**

If no token is available, instruct the user:

> Create a service token in Prisma Console → Workspace Settings → Service Tokens.
> Copy the token and paste it here.

Read `references/auth.md` for details on service token creation.

**Handling the token securely:**

When you have a token (from prompt, environment, or user input), use it for API calls while following these security practices:

- **If prompting the user for the token**: Request hidden input (not logged or echoed in terminal output)
- **When running shell commands with the token**: Disable shell history/tracing to avoid logging it
  - Prefix your command with `( set +x; ... )` to temporarily disable `set -x`
  - Assign it to `PRISMA_SERVICE_TOKEN` and reuse that same variable for every API call through Step 4; unset it only after the final API request
- **Do not display or log the token** in any output
- **Service tokens remain valid until explicitly revoked** in Workspace Settings — rotation is optional

**Example workflow** (capturing into `PRISMA_SERVICE_TOKEN` with shell tracing disabled):

```bash
read -sp 'Paste your PRISMA_SERVICE_TOKEN: ' PRISMA_SERVICE_TOKEN
export PRISMA_SERVICE_TOKEN
echo
( set +x
  # Use $PRISMA_SERVICE_TOKEN for API calls with timeouts and bounded retries
  curl -s --fail-with-body \
    --connect-timeout 10 --max-time 30 \
    --retry 3 --retry-delay 1 --retry-max-time 10 \
    -H "Authorization: Bearer $PRISMA_SERVICE_TOKEN" https://api.prisma.io/v1/projects
)
# Reuse $PRISMA_SERVICE_TOKEN unchanged for Steps 2-4, then:
# unset PRISMA_SERVICE_TOKEN
```

### Step 2: List available regions

Fetch the list of available Prisma Postgres regions to let the user choose where to deploy.

```bash
curl -s --fail-with-body \
  --connect-timeout 10 --max-time 30 \
  --retry 3 --retry-delay 1 --retry-max-time 10 \
  -H "Authorization: Bearer $PRISMA_SERVICE_TOKEN" \
  https://api.prisma.io/v1/regions/postgres
```

The response contains an array of regions with `id`, `name`, and `status`. Only present regions where `status` is `available`.

**Present the regions as an interactive menu** — let the user pick from options rather than typing a region ID manually.

Read `references/endpoints.md` for the full response shape.

### Step 3: Create a project with a database

```bash
curl -s --fail-with-body \
  --connect-timeout 10 --max-time 30 \
  --retry 3 --retry-delay 1 --retry-max-time 10 \
  -X POST https://api.prisma.io/v1/projects \
  -H "Authorization: Bearer $PRISMA_SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "<project-name>",
    "region": "<region-id>",
    "createDatabase": true
  }'
```

Use the current directory name as the project name by default.

The response is wrapped in `{ "data": { ... } }`. Extract:

- `data.id` — the project ID (prefixed with `proj_`)
- `data.database.id` — the database ID (prefixed with `db_`)
- `data.database.connections[0].endpoints.direct.connectionString` — the direct PostgreSQL connection string

Use the **direct** connection string (`endpoints.direct.connectionString`). Do not use the pooled or accelerate endpoints — those are for legacy Accelerate setups and not needed for new projects.

If the response status is `provisioning`, implement a polling loop with these safeguards:

1. **Maximum deadline**: Set a timeout (e.g., 5 minutes) from the start of polling. Fail with an explicit error if the deadline is exceeded.
2. **Exponential backoff**: Start with a 2-second delay, then increase by 1.5x after each poll (e.g., 2s, 3s, 4.5s, 6.75s, ...). Cap the maximum delay at 30 seconds.
3. **Poll `GET /v1/databases/<database-id>`** and check the `status` field:
   
   ```bash
   curl -s --fail-with-body \
     --connect-timeout 10 --max-time 30 \
     --retry 3 --retry-delay 1 --retry-max-time 10 \
     -H "Authorization: Bearer $PRISMA_SERVICE_TOKEN" \
     https://api.prisma.io/v1/databases/<database-id>
   ```
   
   - **If `status` is `ready`**: Extract the connection string and proceed to Step 5.
   - **If `status` is `failed` or `canceled`**: Stop immediately with an explicit error message (do not retry).
   - **If `status` is still `provisioning`**: Wait for the next backoff interval and poll again.

**If creation fails due to a database limit**, list the user's existing projects and present them as an interactive menu for selection. When displaying options, show the exact **project ID** and **database IDs** for each project. When the user selects a project:

1. **Display the destructive impact immediately**: Show that deleting this project will also remove all associated databases and connections permanently, including the specific IDs (e.g., "Deleting project `proj_abc123` will also delete databases: `db_xyz789`, `db_uvw456`").
2. **Request explicit confirmation immediately**: Ask the user to confirm this destructive action right before deletion (e.g., "Type 'delete proj_abc123' to confirm deletion, or cancel to proceed differently").
3. **Only after explicit confirmation**: Proceed with deletion via `DELETE /v1/projects/<project-id>`, then retry the database creation.
4. **Preserve polling behavior**: The existing polling loop for database provisioning status remains unchanged after successful project deletion and creation.

Read `references/endpoints.md` for the full request/response shapes.

### Step 4: Create a named connection (optional)

If you need a dedicated connection (e.g., per-developer or per-environment), create one:

```bash
curl -s --fail-with-body \
  --connect-timeout 10 --max-time 30 \
  --retry 3 --retry-delay 1 --retry-max-time 10 \
  -X POST https://api.prisma.io/v1/databases/<database-id>/connections \
  -H "Authorization: Bearer $PRISMA_SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "name": "dev" }'
```

Extract the direct connection string from `data.endpoints.direct.connectionString`.

### Step 5: Configure the local project

1. Install dependencies:

```bash
npm install prisma@7 @prisma/client@7 @prisma/adapter-pg@7 pg dotenv tsx
```

All six packages are required:
- `prisma@7` — CLI for migrations, schema push, client generation (Prisma 7)
- `@prisma/client@7` — the generated query client (Prisma 7)
- `@prisma/adapter-pg@7` — Prisma 7 driver adapter for direct PostgreSQL connections
- `pg` — Node.js PostgreSQL driver (used by the adapter)
- `dotenv` — loads `.env` variables for `prisma.config.ts`
- `tsx` — TypeScript executor for running `.ts` files directly

After installation, regenerate the lock file to ensure all transitive dependencies are captured:

```bash
npm install
```

2. **Before writing credentials**: Verify `.gitignore` includes `.env`. Create `.gitignore` if it does not exist.
   - **If `.env` is NOT gitignored**: Abort and require explicit confirmation from the user (`--force` flag or manual `.gitignore` addition) before proceeding.
   - **If `.env` IS gitignored**: Proceed to write the connection string.

3. Write the direct connection string to `.env`:
   - If `.env` already exists: **Update the existing `DATABASE_URL` entry** (replace the value if present) instead of appending duplicates.
   - If `.env` does not exist: Create it with the new entry.
   - After writing: Set restrictive file permissions (`600` on Unix/Linux or equivalent read-only for the user on Windows).

   ```
   DATABASE_URL="<direct-connection-string>"
   ```
   
   Preserve all unrelated `.env` entries when updating.

4. Ensure `package.json` has `"type": "module"` set (Prisma 7 generates ESM output).

5. If `prisma/schema.prisma` does not exist, run `npx prisma init` to scaffold the project. This creates both `prisma/schema.prisma` and `prisma.config.ts`.

6. Ensure `schema.prisma` has the `postgresql` provider and **no** `url` or `directUrl` in the datasource block (Prisma 7 manages connection URLs in `prisma.config.ts`, not in the schema). Include a generator block with an explicit output path:

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
}
```

7. Ensure `prisma.config.ts` loads the connection URL from the environment:

```typescript
import path from 'node:path'
import { defineConfig } from 'prisma/config'
import 'dotenv/config'

export default defineConfig({
  earlyAccess: true,
  schema: path.join(import.meta.dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL!,
  },
})
```

**Important Prisma 7 notes:**
- Connection URLs go in `prisma.config.ts`, never in `schema.prisma`
- The provider in `schema.prisma` must be `"postgresql"` (not `"prismaPostgres"`)
- `dotenv/config` must be imported in `prisma.config.ts` to load `.env` variables

### Step 6: Define schema and push

If the schema already has models, skip to pushing. Otherwise, **present these options as an interactive menu**:

1. **"I'll define my schema manually"** — Tell the user to edit `prisma/schema.prisma` and come back when ready. Wait for them before proceeding.
2. **"Give me a starter schema"** — Add a Blog starter schema (User, Post, Comment with relations) to `prisma/schema.prisma`. Show the user what was added and ask if they want to adjust it before pushing.
3. **"I'll describe what I need"** — Ask the user to describe their data model in natural language (e.g., "I'm building a task manager with projects, tasks, and team members"). Generate a schema from the description, show it, and ask for confirmation before pushing.

Once the schema has models and the user is ready, create a migration and generate the client:

```bash
npx prisma migrate dev --name init
```

This creates migration files in `prisma/migrations/` **and** generates the client in one step. Migration history is essential for CI/CD workflows (`prisma migrate deploy`) and production deployments.

Only use `npx prisma db push` if the user explicitly asks for prototyping-only mode (no migration history). In that case, follow it with `npx prisma generate`.

### Step 7: Verify the connection

After generating the client, create and run a quick verification script to confirm everything works end-to-end. This is **critical** — do not skip this step.

Create a file named `test-connection.ts`:

```typescript
import 'dotenv/config'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/prisma/client.js'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

try {
  const result = await prisma.$queryRawUnsafe('SELECT 1 as connected')
  console.log('Connected to Prisma Postgres:', result)
} finally {
  await prisma.$disconnect()
  await pool.end()
}
```

Run it:

```bash
npx --no-install tsx test-connection.ts
```

**Prisma 7 client instantiation rules:**
- Import from `./generated/prisma/client.js` (not `./generated/prisma`)
- Create a `pg.Pool` with the `DATABASE_URL` connection string
- Wrap it in a `PrismaPg` adapter
- Pass `{ adapter }` to the `PrismaClient` constructor
- Do **not** use `datasourceUrl` — that option does not exist in Prisma 7
- Do **not** use `new PrismaClient()` with no arguments — it will throw

After verification succeeds, delete `test-connection.ts`.

Then share links for the user to explore their database:

- **Prisma Studio (CLI):** `npx prisma studio` — opens a visual data browser locally
- **Console:** `https://console.prisma.io/<workspaceId>/<projectId>/<databaseId>/dashboard` — strip the prefixes (`wksp_`, `proj_`, `db_`) from the IDs returned in Step 3 to build this URL

Read `references/prisma7-client.md` for the full client instantiation reference.

## Error Handling

Read `references/api-basics.md` for the full error reference. Key self-correction patterns:

| HTTP Status | Error Code | Action |
|---|---|---|
| 401 | `authentication-failed` | Service token is invalid or expired. Ask the user to create a new one in Console → Workspace Settings → Service Tokens. |
| 404 | `resource-not-found` | Check that the resource ID includes the correct prefix (`proj_`, `db_`, `con_`). |
| 422 | `validation-error` | Check request body against the endpoint schema. Common: missing `name`, invalid `region`. |
| 429 | `rate-limit-exceeded` | Back off and retry after a few seconds. |

## Reference Files

Detailed API and usage information is in:

```
references/auth.md             — Service token creation and usage
references/api-basics.md       — Base URL, envelope, IDs, errors, pagination
references/endpoints.md        — Endpoint details for projects, databases, connections, regions
references/prisma7-client.md   — Prisma 7 client instantiation and usage patterns
```
