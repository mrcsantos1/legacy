import { clsx } from "clsx";
import {
    AlertTriangle,
    PanelLeftOpen,
    PanelRightOpen,
    X,
    type LucideIcon
} from "lucide-react";

export function ErrorBanner({ message }: { readonly message: string }) {
  return (
    <div
      className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900"
      role="alert"
    >
      <AlertTriangle aria-hidden="true" className="shrink-0" size={16} />
      <span className="min-w-0 truncate">{message}</span>
    </div>
  );
}

// Localized stale-key feedback: one key vanished, the rest of the workbench
// must stay untouched — never a full-screen error or a cleared tree.
export function StaleKeyNotice({
  message,
  onDismiss
}: {
  readonly message: string;
  readonly onDismiss: () => void;
}) {
  return (
    <div
      className="absolute bottom-4 right-4 z-20 flex max-w-sm items-center gap-2 rounded-md border border-[#C3BAAA] bg-[#F7F1E8] px-3 py-2 text-xs text-[var(--legacy-ink)] shadow-lg"
      role="status"
    >
      <AlertTriangle
        aria-hidden="true"
        className="shrink-0 text-amber-700"
        size={14}
      />
      <span className="min-w-0">{message}</span>
      <button
        aria-label="Dismiss stale key notice"
        className="shrink-0 rounded p-0.5 text-[#6F675C] transition hover:bg-[#ECE3D6]"
        onClick={onDismiss}
        title="Dismiss"
        type="button"
      >
        <X aria-hidden="true" size={13} />
      </button>
    </div>
  );
}

export function EmptyState({
  hint,
  icon: Icon,
  title
}: {
  readonly hint?: string;
  readonly icon?: LucideIcon;
  readonly title: string;
}) {
  return (
    <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 px-6 text-center text-[#6F675C]">
      {Icon ? <Icon aria-hidden="true" size={22} /> : null}
      <p className="text-sm font-medium">{title}</p>
      {hint ? <p className="max-w-xs text-xs">{hint}</p> : null}
    </div>
  );
}

export function SkeletonRows({
  columns,
  rows = 6
}: {
  readonly columns: number;
  readonly rows?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <tr key={rowIndex} aria-hidden="true">
          {Array.from({ length: columns }, (_, columnIndex) => (
            <td
              className="border-b border-[#E0D7C8] px-4 py-3"
              key={columnIndex}
            >
              <div className="h-3 w-full max-w-[140px] animate-pulse rounded bg-[#E0D7C8]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function CollapsedRail({
  label,
  onExpand,
  side
}: {
  readonly label: string;
  readonly onExpand: () => void;
  readonly side: "left" | "right";
}) {
  const Icon = side === "left" ? PanelLeftOpen : PanelRightOpen;

  return (
    <div
      className={clsx(
        "flex h-full w-11 shrink-0 flex-col items-center gap-3 bg-[#F7F1E8] py-3",
        side === "left"
          ? "border-r border-[#C3BAAA]"
          : "border-l border-[#C3BAAA]"
      )}
    >
      <button
        aria-label={`Expand ${label}`}
        className="rounded-md p-1.5 text-[#6F675C] transition hover:bg-[#ECE3D6] hover:text-[var(--legacy-ink)]"
        onClick={onExpand}
        title={`Expand ${label}`}
        type="button"
      >
        <Icon aria-hidden="true" size={16} />
      </button>
      <span className="select-none text-xs font-medium uppercase tracking-wide text-[#6F675C] [writing-mode:vertical-rl]">
        {label}
      </span>
    </div>
  );
}
