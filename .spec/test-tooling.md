# Test Tooling

Status: Required — Wave 8

## Contract

- The app is Next.js. No Vite application scaffold may exist.
- Vitest may use Vite internally; that is allowed.

## Rules

- Remove any real Vite app files if present: `index.html`, `src/main.tsx`,
  `vite.config.*`, Vite-only env/scripts. (Audit found none.)
- Decide if `@vitejs/plugin-react` is needed for the React Vitest transform.
  - If removable: update `vitest.config.mts`, `package.json`, lockfile via pnpm.
  - If not: document that it stays because the React test transform needs it.

## Acceptance

- No Vite app scaffold remains.
- Tests still run.
- The dependency decision is documented.

## Verify

typecheck · lint · test · build
