# State Management

Status: Decision — Wave 4 (decide before the UI rewrite)

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

## Follow-up (implementation steps)

- Add `@tanstack/react-query` + a provider in `app/layout.tsx`.
- Wrap `client.ts` calls in query/mutation hooks under `features/database/model/`.
- Move UI state into a workspace reducer/context (enables tabs — see workspace-tabs.md).
- Port tests; delete Effector stores/deps once parity is reached.

## Verify

typecheck · lint · test
