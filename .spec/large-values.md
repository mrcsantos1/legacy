# Large Values & Pagination

Status: Required — Wave 6

## Contract

- Browsing and inspection never load unbounded data or freeze the browser.
- Tree and resource lists load via cursors with a load-more path.
- Inspection returns bounded previews by default.
- Pretty JSON formatting happens only on explicit user action.
- Keep only the current inspected value per active tab; discard the previous on change.

## DataPreview metadata (extend)

truncated flag · itemCount? · byteSize? · cursor/offset? · display-mode hint.

## Redis adapter bounded reads

- String: bounded preview + truncated flag (use string range ops).
- Hash: incremental `hScan`, not unbounded `hGetAll`.
- List: `lLen` + bounded `lRange`.
- Set: incremental `sScan`, not unbounded `sMembers`.
- Sorted set: bounded range + pagination metadata.
- Unknown type: explicit unsupported preview.

## Rules

- API query params for preview size + pagination.
- UI: load-more, copy raw preview, format JSON, collapse JSON, "preview only" warning.
- Never `JSON.stringify(value, null, 2)` large values on initial render.
- Tests prove large values call no unbounded Redis ops.

## Acceptance

- Opening a very large value does not freeze the browser.
- Large JSON opens compact/raw first; format/expand needs user action.
- Hash/list/set/zset previews are bounded.
- Load-more/pagination state is visible and test-covered.

## Verify

typecheck · lint · test · build
