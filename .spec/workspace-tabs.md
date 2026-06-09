# Workspace Tabs

Status: Required — Wave 3

## Contract

- Several active connections at once, shown as tabs. One active tab id.
- A remembered list is not the same as active connections.
- Closing a tab disconnects that session connection.

## Per-tab state (isolated)

tree nodes · selected namespace · search text · resource cursor ·
selected resource · inspection payload · loading/error flags.

## Rules

- Replace the single global `$selectedConnectionId` with per-tab state keyed by tab id.
- Refresh affects only the active tab unless a tested background policy says otherwise.
- Connection errors are tab-scoped where possible.
- Tab keyboard nav where practical: arrow keys, labeled close buttons, visible active state.
- Distinct UI states: remembered · connecting · active · failed · disconnected.

## Acceptance

- Two Redis connections are active simultaneously.
- Switching tabs restores that tab's folder/search/selection.
- Closing a tab does not erase remembered entries.
- Refreshing one tab does not flicker or clear another.

## Verify

typecheck · lint · test
