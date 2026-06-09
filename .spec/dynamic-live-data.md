# Dynamic Live Data Requirement

## Status

Required for Legacy.

## Problem

Legacy must not show database state as a static snapshot after the user opens a
key, folder, or record. Redis values and metadata can change without another
click from the user, especially TTL. A TTL shown on screen that only changes
after reopening the key is stale and misleading.

## Requirement

All visible database state in the application must be dynamic while the relevant
view is open.

This includes:

- TTL displayed in the record content panel, record inspector, and resource
  table.
- Record metadata shown in side panels.
- Record existence in the left navigation tree and center resource table.
- Selected record state after expire, delete, rename, update, or external Redis
  changes detected by refresh/polling.

## TTL Behavior

- TTL values must update automatically while a record is selected.
- The user must not need to click the key again, reopen the record, navigate
  away, or manually refresh just to see TTL countdown changes.
- A persistent key must continue to display as persistent.
- A key with finite TTL must visibly count down or be refreshed often enough
  that the displayed value does not remain static.
- When TTL reaches expiration and the key no longer exists, the UI must clear
  the selected record and remove that key from the left tree and resource table.

## Dynamic UI Behavior

- The left tree and resource table must not retain records that the application
  knows no longer exist.
- Any API response that proves a selected key no longer exists must immediately
  remove that key from visible UI state.
- Mutations that change key identity or existence must refresh affected visible
  metadata and navigation state without requiring another user click.
- Polling or scheduled refresh must be bounded and provider-aware. It must not
  introduce blocking Redis keyspace reads.

## Acceptance Criteria

- Opening a Redis key with TTL shows a TTL value that changes over time without
  reselecting the key.
- After setting a new TTL from the UI, the displayed TTL begins updating from
  the new value automatically.
- When a selected key expires, the record view and inspector stop showing it,
  and the key is removed from the left tree and center table.
- If Redis reports `NotFoundError` for a visible key, the key disappears from
  the UI immediately.
- Automated tests cover live TTL refresh and stale-key removal.

## Non-Requirements

- The UI does not need millisecond-accurate TTL rendering.
- The application does not need to subscribe to Redis keyspace notifications for
  this requirement.
- Dynamic refresh must not compromise the provider-agnostic API boundary.
