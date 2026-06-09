# Legacy

Legacy is a Redis-first, provider-agnostic database explorer built with
Next.js 16, strict TypeScript, Tailwind CSS, Effector, and Docker.

The long-term goal is to become a universal database viewer that can support
NoSQL and SQL providers through a stable adapter interface. Redis is the first
provider because its flat keyspace is a good proving ground for navigation,
inspection, and mutation workflows.

## Current Status

Legacy is in early product development. The app is usable for local Redis
inspection, but the public API and UI contracts are still evolving.

## Principles

- Provider-specific behavior belongs behind server-side adapters.
- API routes and frontend state use provider-agnostic DTOs.
- Redis browsing uses cursor-based scans and must not depend on blocking
  whole-keyspace operations.
- UI-entered credentials are session-scoped and are not returned to the browser.
- AI-assisted contributions are welcome only when they are reviewed, tested,
  and aligned with the project specification.

## Tech Stack

- Next.js 16 App Router
- TypeScript with strict mode
- Tailwind CSS
- Effector and effector-react
- Redis adapter using `redis`
- Vitest and Testing Library
- Docker
- pnpm

## Local Development

```powershell
pnpm install
pnpm run dev
```

Open `http://localhost:3000`.

## Docker

Build and run the standalone image:

```powershell
docker build -t legacy:local .
docker run --rm -p 3000:3000 legacy:local
```

Open `http://localhost:3000` and enter a Redis URL in the app to connect.

## Verification

Run these before opening a pull request or handing work back:

```powershell
pnpm run typecheck
pnpm run lint
pnpm test
pnpm run build
docker build -t legacy:local .
```

## Architecture

Server-side database integration lives under `src/server/database`.

- `types.ts` defines provider-agnostic contracts.
- `service.ts` coordinates connection resolution and adapter calls.
- `registry.ts` maps providers to adapters.
- `redis/` contains Redis-specific scanning, namespace derivation, value
  inspection, and mutation code.

The frontend calls only generic routes under `src/app/api`. UI state lives in
Effector models under `src/features/database/model`, and the workbench UI lives
under `src/features/database/ui`.

## Redis Explorer Model

Redis keys are flat, but Legacy derives an explorer tree from `:`-delimited key
segments. Tree nodes are classified as:

- `folder`: a virtual prefix with child keys.
- `record`: a real Redis key with no deeper children.
- `hybrid`: a real Redis key that is also a prefix for deeper keys.

Folder nodes load child contents in the center panel. Record nodes open their
value in the center panel, with metadata and actions in the inspector.

## AI-Assisted Development

This project supports AI coding tools, but it is not a vibe-coding project.
Agents and assistants must follow `AGENTS.md`, `SPEC.md`, and the tests. Generated
code must be treated like any other contribution: scoped, reviewed, typed,
tested, and consistent with the adapter architecture.
