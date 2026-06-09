# UI Redesign

Status: Required — Wave 5

## Contract

- The first screen is the usable workbench, not a landing page.
- The app shell fits the viewport (`h-dvh`); no global vertical page scroll.
- Scroll lives only inside regions: connection list, tree, resource table,
  value viewer, inspector.

## Component split (from the 917-line workbench)

app-shell · connection-drawer · tab-strip · namespace-tree · resource-grid ·
value-viewer · inspector · shared status/empty states.

## Rules

- Collapsible side panels with smooth accordion; no content overlap.
- Loading/refresh/connecting/inspecting feel smooth: skeleton rows, subtle opacity,
  non-blocking refresh, no full-screen flicker.
- Value viewer for serious inspection: raw view, JSON view, table/list where apt,
  copy + format actions, size/preview metadata, clear empty/error states.
- Tooltips for every icon-only/ambiguous control: icons, TTL, destructive actions,
  refresh state, preview limits.
- Text never overflows buttons/tabs/panels at common desktop + mobile widths.
- Keep Tailwind + lucide-react unless the state/design review justifies otherwise.

## Acceptance

- The body does not scroll vertically in normal use.
- Long trees scroll only inside the tree; large values only inside the viewer;
  the inspector scrolls independently.
- Loading/refresh never blanks the whole workbench.
- Modern, professional, dense, operational look.

## Verify

typecheck · lint · test · build · browser screenshots (desktop + narrow)
