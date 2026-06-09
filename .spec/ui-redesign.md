# UI Redesign

Status: Implemented — Wave 5

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

## As implemented (Wave 5)

- The 917-line workbench was split into focused modules under
  `features/database/ui`: `tab-strip` (`ConnectionTabStrip`),
  `connection-drawer` (`ConnectionDrawer`), `namespace-tree` (`NamespaceTree`,
  UI tree distinct from the `model/namespace-tree` logic), `resource-grid`
  (`ResourceGrid`), `value-viewer` (`ValueViewer`), `inspector`
  (`InspectorPanel`), and `workbench-states` (`ErrorBanner`, `EmptyState`,
  `SkeletonRows`, `CollapsedRail`). Pure formatting helpers moved to
  `value-format.ts`. `database-workbench.tsx` is now a slim shell (~620 lines).
- Viewport lock via `<main className="flex h-dvh flex-col overflow-hidden">`;
  the body never scrolls. The panel row is flex with `min-h-0`/`min-w-0` and
  `overflow-hidden`, so the tree, resource grid, value viewer, and inspector
  each scroll independently. `min-w-0` on the center keeps the inspector
  on-screen at narrow widths (no page-level horizontal scroll at ~820px).
- Side panels collapse to a labeled vertical `CollapsedRail` (component swap,
  not an animated accordion) with `Collapse/Expand Workspace` and
  `Collapse/Expand Inspector` controls; collapsed/expanded states never overlap
  content.
- Smooth loading: `SkeletonRows` for the initial grid load, `opacity-60` while
  refreshing, a non-blocking header refresh spinner; the workbench is never
  blanked.
- `ValueViewer` provides Edit / Pretty toggle, Format (re-indent JSON), and
  Copy actions, a "Detected JSON string" badge, and preview-metadata facts
  (item count, byte size, truncation) from `describePreviewMeta`.
- Icon-only and ambiguous controls carry `title` tooltips (collapse, refresh,
  TTL/Expire, Save, Delete, tab close); text truncates rather than overflowing.

### Deferred

- True mobile stacking (single-column layout below a breakpoint) is out of
  scope; narrow widths rely on `min-w-0` fit plus manual panel collapse.
- Collapse is an instant component swap rather than an animated accordion.
- Table/list rendering for object/list/zset previews remains a Wave 6 concern.
