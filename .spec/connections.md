# Connections

Status: Required — Wave 2

## Contract

- Users enter DB credentials in the UI. The browser remembers them 7 days.
- Server connects ONLY after an explicit connect click. Never auto-connect.
- No environment connections; `source: "environment"` is removed/unreachable.

## Remembered entry (browser `localStorage`)

- Key: `legacy:remembered-connections:v1` (single versioned key).
- Fields: id, label, provider, url, database?, tls?, createdAt, expiresAt.
- Expiry: 7 days from last save/update. Drop expired entries on load.
- Loading remembered values never auto-connects.

## Rules

- Remove `getEnvironmentConnection`, env summaries, env prepend from runtime.
- Server keeps active session connections in memory, created only by connect calls.
- Explicit UI actions: save/update remembered, connect, disconnect, delete remembered.
- Disconnect drops the active server connection + closes its tab; keeps the remembered entry.
- API responses never return raw URLs/credentials — redacted previews only.

## Acceptance

- Starting the app with Redis env vars set creates no connection.
- Reload shows non-expired remembered entries and connects to nothing.
- Connect click creates an active server session connection.
- Expired remembered entries are removed from the browser list.
- Raw URLs appear in no API response.

## Verify

typecheck · lint · test
