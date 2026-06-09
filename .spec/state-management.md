# State Management

Status: Implemented — Wave 3 (Effector removed)

## Current

- Effector owns BOTH server-request orchestration and UI state.
- `database-model.ts`: 7 events, 7 effects, 16 stores, 19 samples (454 lines).
- Server data (connections, namespaces, resources, inspection, TTL) and UI data
  (selection, search, loading flags) are mixed in one store graph.
- Liveness is a crude, unconditional 1s poll.

## Server state that fits a query cache

caching · invalidation · retries · cancellation · cursor pagination ·
background refetch (TTL liveness) · per-connection keys (multi-tab).

## UI state to keep local

active tab id · selected namespace path · search draft · selected resource ·
form inputs · panel collapse → React state/reducer + Context.

## Options

1. Keep Effector for everything.
2. TanStack Query (server state) + React state (UI). Remove Effector.
3. TanStack Query (server) + Effector only for complex UI workflow.

## Decision

Adopt **Option 2**. Server state → TanStack Query keyed by `[connectionId, …]`;
UI/workspace state → React `useReducer` + Context. Effector removed.

Rationale: the model is ~90% server orchestration; multi-tab maps to query keys;
`refetchInterval` replaces the manual poll for live TTL; deletes ~450 lines of
hand-written samples. Note: supersedes the Effector project default for V1.

## Cost & risk

- Cost: add `@tanstack/react-query`; rewrite `database-model.ts` as hooks;
  re-point the 917-line workbench; port `database-model.test.ts`. Net code drops.
- Risk: behavior parity for ghost-key removal + live TTL during the swap.
  Mitigation: land it inside the Wave 3/5 rewrite, keep tests green per step.
- Reversible: client-only change; the provider-agnostic API/server is untouched.

## Follow-up (as implemented)

- `database-queries.ts`: TanStack hooks over `client.ts`, keyed by
  `[connectionId, …]`; liveness via `refetchInterval`; `DatabaseApiProvider`
  injects the API for tests.
- `workspace.tsx`: `useReducer` + Context owns per-tab UI state (tabs, namespace
  path, search draft, selection); see workspace-tabs.md.
- `namespace-tree.ts`: pure helpers (merge, scope, ghost purge, NotFound).
- `QueryClientProvider` is colocated in the `DatabaseWorkbench` shell (single
  consumer; keeps `layout.tsx` plain and the workbench testable via `api` prop).
- Effector stores/deps deleted once parity (ghost purge, live TTL) was green.

## Verify

typecheck · lint · test
