# Dynamic Live Data

Status: Required — Wave 7

## Contract

- While a view is open, visible DB state is live, not a static snapshot.
- Covers: TTL (content panel, inspector, resource table), record metadata,
  key existence in tree + table, selected record after expire/delete/rename/update.

## TTL

- Counts down client-side from the last server-observed TTL + its timestamp;
  no per-second server calls.
- Server reconciles TTL on explicit refresh and bounded background intervals.
- Persistent keys stay persistent.
- Color tiers (each with a tooltip explaining its meaning):
  persistent → neutral · healthy → normal · near expiry → warning ·
  critical (~0) → danger · expired/not found → removed.

## Stale keys (no flicker)

- A key proven gone (`NotFoundError` or expiry) is removed immediately from tree
  + table; the selected record clears.
- Remove only the missing key; never clear all tree/resource state to recover.
- Refresh preserves existing visible rows while the next scan is pending;
  use localized loading indicators, not a full-workbench refresh.

## Acceptance

- Open key with TTL: the value changes over time without reselecting.
- After setting a new TTL: the display starts updating from the new value.
- Expired key: record/inspector stop showing it; the key leaves tree + table.
- `NotFoundError` on a visible key: it disappears immediately, no blink.
- Low TTL draws attention; tooltips explain TTL + actions.
- Tests cover live TTL countdown and targeted stale-key removal.

## Non-requirements

- No millisecond-accurate TTL. No Redis keyspace subscriptions.
- Liveness must not break the provider-agnostic boundary or add blocking reads.

## Verify

typecheck · lint · test · build
