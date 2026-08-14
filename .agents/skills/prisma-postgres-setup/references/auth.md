# auth

How to authenticate with the Prisma Management API using service tokens.

## Service Tokens

Service tokens authenticate server-to-server requests. They are scoped to a workspace and grant access to all resources within it.

### Creating a service token

1. Open https://console.prisma.io
2. Navigate to **Workspace Settings** → **Service Tokens**
3. Click **Create Token**
4. Copy the token immediately — it is only shown once

### Using a service token

Use the token in the `Authorization` header of every API request:

```bash
curl -H "Authorization: Bearer $PRISMA_SERVICE_TOKEN" \
  https://api.prisma.io/v1/projects
```

**Security-first workflow:**

1. **Obtain the token** from user prompt (hidden input), environment variable, or `.env` file
2. **Disable shell tracing** to prevent logging the token:
   ```bash
   ( set +x
     # Store in temporary variable
     PRISMA_SERVICE_TOKEN="<token>"
     # Use the token for API calls here
     curl -H "Authorization: Bearer $PRISMA_SERVICE_TOKEN" ...
     # Clear immediately after use
     unset PRISMA_SERVICE_TOKEN
   )
   ```
3. **Never log or echo the token** at any point
4. **Unset the variable** after all API calls are complete

### Token scope

Service tokens are workspace-scoped. A single token grants access to all projects, databases, and connections within the workspace. There are no project-scoped tokens at this time.

### Security practices

- Store tokens in environment variables or secret managers, never in source code
- Add `.env` to `.gitignore` to prevent accidental commits
- Disable shell tracing (`set +x`) while handling tokens to prevent history/log exposure
- Unset token variables immediately after use
- Use hidden input (e.g., `read -sp` in Bash) when prompting users for tokens
- **Do not log or display the token** in any output or command history
- Service tokens remain valid until explicitly revoked via Console → Workspace Settings → Service Tokens (rotation is optional)
- In CI/CD, store tokens as encrypted secrets (e.g., GitHub Secrets) and treat as above

## OAuth 2.0 (for user-scoped access)

OAuth is used when acting on behalf of a user, typically in partner/integrator flows. See the `prisma-postgres-integrator` skill for OAuth details.

For standard database setup, service tokens are the recommended authentication method.
