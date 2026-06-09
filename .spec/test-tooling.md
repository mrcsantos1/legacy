# Test Tooling

Status: Required — Wave 8

## Contract

- The app is Next.js. No Vite application scaffold may exist.
- Vitest may use Vite internally; that is allowed.

## Rules

- Remove any real Vite app files if present: `index.html`, `src/main.tsx`,
  `vite.config.*`, Vite-only env/scripts. (Audit found none.)
- `@vitejs/plugin-react` is removed: Vitest transforms `.tsx` via esbuild using
  `tsconfig` `jsx: react-jsx`. All React tests pass without it. `vitest.config.mts`
  uses no plugins; the dependency and its lockfile entries are pruned via pnpm.

## Acceptance

- No Vite app scaffold remains.
- Tests still run (25/25 green without the plugin).
- The dependency decision is documented.

## Verify

typecheck · lint · test · build
