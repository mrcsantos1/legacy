## Summary

<!-- What changed and why. Link the relevant `.spec/` file or issue. -->

## Provider boundary

- [ ] Provider-specific code stays under `src/server/database`.
- [ ] API routes and frontend use provider-agnostic DTOs.
- [ ] No direct Redis client usage in frontend code.

## Tests

- [ ] Added or updated tests for the changed behavior.

## UI

- [ ] Screenshots attached for UI changes (desktop + narrow), or N/A.

## Verification

```powershell
pnpm run typecheck
pnpm run lint
pnpm test
pnpm run build
```

<!-- Paste the relevant output. -->

## Docs

- [ ] Updated `SPEC.md` / `README.md` / `.spec/` when product behavior changed.

## AI-assisted work

- [ ] Generated code was reviewed, tested, and aligned with `SPEC.md` (draft until verified).
