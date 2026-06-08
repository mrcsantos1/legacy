# Legacy Specification

## Summary

Legacy is a universal, web-based database visualization and management tool. The first supported provider is Redis, but the product shell, API surface, and server domain model are provider-agnostic so SQL support can be added later without redesigning the app.

The project is a greenfield Next.js 16 App Router application using strict TypeScript, Tailwind CSS, Effector, Docker, and Docker Compose.

## Product Goals

- Let users connect Legacy to any reachable Redis instance, local or remote.
- Provide an optional demo Redis service for local exploration.
- Keep Redis-specific behavior behind an adapter interface.
- Keep frontend state and API routes oblivious to the concrete database provider.
- Support safe data inspection and management workflows without blocking large Redis keyspaces.

## UX Model

Legacy uses a Hybrid Explorer Workbench:

- Left sidebar: connections and virtual namespaces.
- Center panel: searchable, paginated, virtualized resource grid.
- Right panel: inspector/editor for selected resource values and metadata.

Redis keys are flat, but Legacy derives virtual namespaces by splitting keys on delimiters such as `:`. Namespace browsing must be lazy and backed by cursor-based scans. The UI must never assume it can fully materialize the keyspace.

The same layout should later map to SQL:

- Connections remain provider-neutral.
- Redis namespaces map to database/schema/table hierarchy.
- Redis key grids map to table or query-result grids.
- Redis value inspectors map to row, schema, index, and constraint inspectors.

## Database Architecture

The server core owns all provider-specific access. Route handlers validate requests, call the generic service layer, and return generic DTOs.

The database core exposes:

- `ConnectionConfig`
- `ConnectionSummary`
- `AdapterCapabilities`
- `NamespaceNode`
- `ResourceDescriptor`
- `DataPreview`
- `MutationRequest`
- `OperationResult`

The Redis adapter must:

- Use cursor-based `SCAN` for key navigation.
- Avoid blocking whole-keyspace commands for browsing.
- Inspect values based on Redis type.
- Return TTL and metadata when available.
- Support safe create, update, delete, rename, and expire mutations.

All database API route handlers run in the Node.js runtime.

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

- `LEGACY_DEFAULT_REDIS_URL` optionally configures a server-defined Redis connection.
- Users may create temporary Redis connections from the UI.
- Temporary credentials are stored server-side in memory and scoped by an HTTP session cookie.
- Raw credentials are never returned to the browser.
- Temporary connections are cleared when the app restarts.
- Persistent multi-user credential storage is out of scope for v1.

## Docker Strategy

`compose.yaml` starts the Legacy web app by default. A `demo-redis` profile starts a local Redis service for users who want a disposable test database.

The web service binds to localhost by default and accepts `LEGACY_WEB_PORT` overrides. Demo Redis is not published to the host by default. Users can point Legacy at any Redis instance through `LEGACY_DEFAULT_REDIS_URL` or the UI connection form.

## Verification

The implementation must pass:

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

Docker smoke checks should cover app-only mode and demo Redis profile mode.
