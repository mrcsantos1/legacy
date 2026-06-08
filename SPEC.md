# Legacy Specification

## Summary

Legacy is a universal, web-based database visualization and management tool.
The first supported provider is Redis, but the application shell, server API,
state model, and UI concepts must remain provider-agnostic enough to support
SQL providers later.

The project is a Next.js 16 App Router application using strict TypeScript,
Tailwind CSS, Effector, pnpm, Docker, and Docker Compose.

## Product Goals

- Let users connect to reachable Redis instances, local or remote.
- Provide an optional disposable Redis service for local exploration.
- Keep provider-specific behavior behind server-only adapters.
- Keep frontend state and API routes unaware of concrete provider internals.
- Support safe inspection and basic management workflows.
- Browse large keyspaces through bounded, cursor-based operations.

## Non-Goals For V1

- Persistent multi-user credential storage.
- Full Redis command execution.
- Full hash/list/set/zset editing semantics.
- SQL provider support.
- Replacing provider-specific observability or backup tools.

## UX Model

Legacy uses a three-pane Hybrid Explorer Workbench:

- Left sidebar: connections and derived navigation tree.
- Center panel: folder contents or selected record content.
- Right panel: record metadata, TTL, and mutation actions.

Redis keys are flat. Legacy derives a tree by splitting keys with `:` in v1.
The tree must classify nodes as:

- `folder`: virtual prefix with child keys.
- `record`: real database object with no child keys.
- `hybrid`: real database object that also has child keys below the same prefix.

Clicking a folder loads direct children in the center panel. Clicking a record
opens the record content in the center panel. Hybrid nodes expose both actions:
folder navigation and record inspection.

The same model should map to SQL later:

- Redis folders map to database/schema/table hierarchy.
- Redis records map to keys or rows.
- SQL tables, views, rows, indexes, and constraints can become resource
  descriptors without changing the API route shape.

## Database Architecture

The server core owns all provider-specific access. Route handlers validate
requests, call the generic database service, and return generic DTOs.

The database core exposes:

- `ConnectionConfig`
- `ConnectionSummary`
- `AdapterCapabilities`
- `NamespaceNode`
- `ResourceDescriptor`
- `DataPreview`
- `MutationRequest`
- `OperationResult`

Adapters must implement `DatabaseAdapter` and must never leak provider-specific
client instances to API routes or frontend code.

## Redis Adapter Requirements

The Redis adapter must:

- Use cursor-based `SCAN` for navigation.
- Avoid blocking whole-keyspace commands for browsing.
- Derive namespace nodes from key segments.
- Distinguish virtual folders from real keys.
- Return leaf keys as records rather than empty folders.
- Inspect values based on Redis type.
- Return TTL and provider metadata when available.
- Support safe create, update, delete, rename, and expire mutations where the
  Redis type semantics are valid.

## API Surface

- `GET /api/health`
- `GET /api/connections`
- `POST /api/connections/session`
- `DELETE /api/connections/session/:id`
- `GET /api/connections/:id/namespaces`
- `GET /api/connections/:id/resources`
- `GET /api/connections/:id/resources/:resourceId`
- `POST /api/connections/:id/mutations`

The frontend must only talk to these generic routes.

## Connection And Credential Model

- `LEGACY_DEFAULT_REDIS_URL` optionally configures a server-defined Redis
  connection.
- Users may create temporary Redis connections from the UI.
- Temporary credentials are stored server-side in memory and scoped by an HTTP
  session cookie.
- Raw credentials are never returned to the browser.
- Temporary connections are cleared when the app restarts.

## Docker Strategy

`compose.yaml` starts the Legacy web app by default. A `demo-redis` profile
starts a local Redis service for disposable test data.

The web service binds to localhost by default and accepts `LEGACY_WEB_PORT`
overrides. Demo Redis is not published to the host by default. Users can point
Legacy at Redis through `LEGACY_DEFAULT_REDIS_URL` or the UI connection form.

## Development Discipline

This project supports AI coding assistants, but the source of truth is the code,
the tests, and this specification. Contributions must not rely on unreviewed
generated output.

Expected workflow:

- Read the relevant code before editing.
- Keep changes scoped to the requested behavior.
- Add or update tests for behavior changes.
- Preserve the provider-agnostic boundary.
- Run the verification commands before handing work back.

## Verification

The implementation must pass:

- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm test`
- `pnpm run build`

Docker smoke checks should include:

- `docker compose build web`
- `docker compose up`
- `docker compose --profile demo-redis up`
