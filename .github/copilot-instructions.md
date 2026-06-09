# GitHub Copilot Instructions

Read `SPEC.md` and `AGENTS.md` before suggesting architectural changes.

Use these project defaults:

- Package manager: pnpm
- Framework: Next.js 16 App Router
- Language: strict TypeScript
- Styling: Tailwind CSS
- State management: TanStack Query (server state) + React reducer/context (UI state)
- Tests: Vitest and Testing Library
- Infrastructure: Docker

Important boundaries:

- Keep provider-specific code in `src/server/database`.
- Keep Redis-specific behavior inside the Redis adapter and Redis helpers.
- Keep API routes provider-agnostic.
- Do not suggest direct Redis client usage in frontend code.
- Do not suggest blocking Redis keyspace commands for browsing.
- Leaf Redis keys should open as records; they should not be treated as empty
  folders.

Before considering a change complete, run or request:

```powershell
pnpm run typecheck
pnpm run lint
pnpm test
pnpm run build
```
