# Distribution

Status: Required — Wave 1

## Contract

- Ship as one Dockerized Next.js standalone service. No Docker Compose.
- Run: `docker build -t legacy:local .` then
  `docker run --rm -p 3000:3000 legacy:local`.
- No environment-driven DB connection. No `LEGACY_DEFAULT_REDIS_URL`.

## Rules

- Delete `compose.yaml`; remove Compose from README, SPEC, CONTRIBUTING, `.env.example`.
- Keep only app env vars still real after the connection refactor (see connections.md).
- `next.config.ts` keeps `output: "standalone"`; Dockerfile runs `node server.js`.
- Add `.github` PR + issue (bug/feature) templates requiring: provider-boundary
  awareness, tests, UI screenshots, verification output, doc updates.
- CI runs on every PR: typecheck, lint, test, then `pnpm run build` + `docker build`.
  All checks are required before merge (branch protection on `main`).
- Contribution docs: AI-generated code is draft until reviewed, tested, SPEC-aligned.

## Acceptance

- Docs explain Docker run without Compose.
- No public doc configures Redis via an env URL.
- Repo no longer implies Compose is required.
- PR + issue templates exist and are project-specific.
- CI blocks merge unless typecheck, lint, test, build, and docker build pass.

## Verify

typecheck · lint · test · build · `docker build -t legacy:local .`
