# Repository Guidelines

This file provides guidance to AI agents when working with code in this repository.

> **Single source of truth:** This file is a concise pointer document.
> All authoritative architecture, coding rules, commands, and conventions
> live in **CLAUDE.md** at the project root. Read that file first.

## Quick Reference

### Architecture

Go backend + monorepo frontend (pnpm workspaces + Turborepo) with shared packages.

- `server/` — Go backend (Chi router, sqlc, gorilla/websocket)
- `apps/web/` — Next.js frontend (App Router)
- `apps/desktop/` — Electron desktop app
- `packages/core/` — Headless business logic (Zustand stores, React Query hooks, API client)
- `packages/ui/` — Atomic UI components (shadcn/Base UI, zero business logic)
- `packages/views/` — Shared business pages/components
- `packages/tsconfig/` — Shared TypeScript config

### State Management (critical)

- **React Query** owns all server state (issues, members, agents, inbox, workspace list)
- **Zustand** owns all client state (current workspace selection, view filters, drafts, modals)
- All Zustand stores live in `packages/core/` — never in `packages/views/` or app directories
- WS events invalidate React Query — never write directly to stores

### Optimistic IDs and Query Boundaries

- Optimistic client IDs (for example `optimistic-*`) must never cross API boundaries that expect backend UUIDs.
- Guard shared query options in `packages/core/`, but also check every call site that spreads options and overrides fields such as `enabled`.
- If a React Query option has `enabled: isUUID(id)` in core, a component override must preserve that predicate (`enabled: isUUID(id) && localCondition`), not replace it with only local UI state.
- Add regression tests at the component boundary when a bug involves React Query option overrides; testing only the shared query helper can miss the real request path.

### Package Boundaries (hard rules)

- `packages/core/` — zero react-dom, zero localStorage, zero process.env
- `packages/ui/` — zero `@multica/core` imports
- `packages/views/` — zero `next/*`, zero `react-router-dom`, use `NavigationAdapter` for routing
- `apps/web/platform/` — only place for Next.js APIs

### Commands

Startup: use `./start.sh` for the normal local dev stack; it keeps the web app on port `4000`, selects an available backend port, and writes matching values into `.env.start`.

```bash
./start.sh            # Preferred local startup script
make dev              # Auto-setup + start everything (see CLAUDE.md)
pnpm typecheck        # TypeScript check
pnpm test             # TS unit tests (Vitest)
make test             # Go tests
make check            # Full verification pipeline
```

See CLAUDE.md for the complete command reference.

### Local Dev Troubleshooting Notes

- Prefer `./start.sh` for local development when present. It should keep the web app on port `4000`, auto-select a free backend port when `8080` is already occupied, and write matching API/WS/CORS values into `.env.start`.
- If login or “Continue” fails after changing ports, verify that frontend origin and backend CORS agree. For a `4000` frontend, `FRONTEND_ORIGIN`, `CORS_ALLOWED_ORIGINS`, and `ALLOWED_ORIGINS` must include `http://localhost:4000`.
- If chat messages send but no assistant response appears, check the local daemon first. The UI may accept the message while the selected runtime is offline, leaving tasks queued until `multica daemon` is running.
- For local daemon debugging, use the `local` profile and verify it points at the active backend HTTP URL, not the websocket URL: `~/.multica/profiles/local/config.json` should use `server_url: http://localhost:<backend-port>` and the current workspace id.
- Useful checks:
  ```bash
  go run ./server/cmd/multica daemon status --profile local
  go run ./server/cmd/multica runtime list --profile local
  tail -n 120 ~/.multica/profiles/local/daemon.log
  ```
- The development login path is email plus verification code. When `MULTICA_DEV_VERIFICATION_CODE` is configured locally, there is no password field; use the configured code.

### Runtime Deletion Troubleshooting

- `DELETE /api/runtimes/{runtimeId}` returning `409 Conflict` usually means the runtime still has active, non-archived agents bound to it. Deleting the local CLI or daemon only makes the runtime offline; it does not unbind agents.
- Backend source of truth: `server/internal/handler/runtime.go` checks `CountActiveAgentsByRuntime` and blocks deletion until every `agent.runtime_id = runtime.id` row is archived or reassigned.
- UI path: left sidebar **Configure → Runtimes** (`/{workspaceSlug}/runtimes`) → click the runtime row → runtime detail right rail **Serving** card. That card lists only agents where `agent.runtime_id === runtime.id && !agent.archived_at`.
- To unblock deletion, click the agent in the **Serving** card, then either:
  - Archive it from the agent detail header `...` menu → **Archive agent**.
  - Reassign it from the agent detail inspector **Properties → Runtime** picker.
- If the **Serving** card is hard to spot, query the database/API rather than guessing. For local DB inspection, join `agent_runtime` to non-archived `agent` rows by `runtime_id` and list the blocking agent names.
- Frontend should not let users discover this only through a console error. Prefer disabling or explaining the delete action when active agent count is non-zero, and treat expected `409` business conflicts as warning-level API logs rather than `console.error`.
