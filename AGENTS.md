# Agent Instructions

These instructions apply to AI coding agents working in this repository.

## Working Contract

Legacy is an engineering project, not a vibe-coding sandbox. Generated code must
be treated as a draft until it is reviewed, tested, and aligned with the
specification.

Before editing:

1. Read `SPEC.md`.
2. Inspect the relevant source files.
3. Identify the smallest behavior change that satisfies the request.
4. Add or update tests before changing production behavior when practical.

## Required Commands

Use pnpm:

```powershell
pnpm install
pnpm run dev
pnpm run typecheck
pnpm run lint
pnpm test
pnpm run build
docker compose build web
```

Do not replace pnpm with npm or yarn.

## Architecture Rules

- Keep database-provider details under `src/server/database`.
- Keep Redis-specific behavior inside the Redis adapter and helper modules.
- API routes under `src/app/api` must return provider-agnostic DTOs.
- Frontend code must call shared API client functions, not provider clients.
- Effector models own UI state transitions.
- UI components should remain clear, dense, and operational rather than
  marketing-oriented.

## Redis Explorer Rules

- Redis keys are flat; folders are derived from `:`-delimited segments.
- A tree node can be `folder`, `record`, or `hybrid`.
- Leaf Redis keys must open as records, not as empty folders.
- Use cursor-based scans; do not add blocking keyspace reads for browsing.

## Safety Rules

- Do not commit secrets or Redis URLs containing credentials.
- Do not persist UI-entered credentials unless the specification changes.
- Do not run destructive Git commands unless the user explicitly asks.
- Do not revert unrelated changes.
- If a requested change weakens the provider-agnostic boundary, explain the
  trade-off before implementing it.

## Documentation

When changing behavior, update `SPEC.md` or `README.md` if the public contract,
developer workflow, or product behavior changes.
