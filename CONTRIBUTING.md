# Contributing

Thanks for helping build Legacy. The project is early, so contributions should
favor clear contracts, tests, and small reviewable changes.

## Development Setup

```powershell
pnpm install
pnpm run dev
```

Open `http://localhost:3000`.

## Pull Request Checklist

- The change is scoped to one coherent behavior or improvement.
- Provider-specific code stays behind the database adapter boundary.
- New behavior is covered by tests.
- Public behavior changes are reflected in `SPEC.md` or `README.md`.
- Verification passes locally:

```powershell
pnpm run typecheck
pnpm run lint
pnpm test
pnpm run build
docker compose build web
```

## Coding Standards

- Prefer existing project patterns over new abstractions.
- Keep TypeScript strict and avoid `any`.
- Keep UI states explicit: loading, empty, partial scan, selected record, and
  error states should be visible and understandable.
- Use Redis `SCAN`-based flows for browsing.
- Treat generated code from AI tools as untrusted until reviewed and verified.

## AI Tooling

AI assistants can help with implementation, tests, and documentation, but they
must follow `AGENTS.md` and `SPEC.md`. A contribution is acceptable because it is
correct, reviewed, and verified; not because it was generated quickly.
