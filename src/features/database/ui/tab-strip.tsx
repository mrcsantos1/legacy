import type { KeyboardEvent } from "react";

import type { WorkspaceTab } from "@/features/database/model/workspace";

import { clsx } from "clsx";
import { Database, X } from "lucide-react";

interface ConnectionTabStripProps {
  readonly activeTabId: string | null;
  readonly onActivate: (id: string) => void;
  readonly onClose: (id: string) => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  readonly tabs: WorkspaceTab[];
}

export function ConnectionTabStrip({
  activeTabId,
  onActivate,
  onClose,
  onKeyDown,
  tabs
}: ConnectionTabStripProps) {
  return (
    <div
      aria-label="Active connections"
      className="flex h-10 shrink-0 items-center gap-1 overflow-x-auto border-b border-[#2C302C] bg-[var(--legacy-charcoal)] px-2"
      onKeyDown={onKeyDown}
      role="tablist"
      tabIndex={0}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;

        return (
          <div
            className={clsx(
              "flex items-center gap-0.5 rounded-t-md px-1",
              isActive ? "bg-[var(--legacy-panel)]" : "hover:bg-[#1F2421]"
            )}
            key={tab.id}
          >
            <button
              aria-selected={isActive}
              className={clsx(
                "flex min-w-0 items-center gap-2 rounded-md px-2 py-1 text-sm",
                isActive
                  ? "font-medium text-[var(--legacy-ink)]"
                  : "text-[var(--legacy-concrete)]"
              )}
              onClick={() => onActivate(tab.id)}
              role="tab"
              title={tab.label}
              type="button"
            >
              <Database aria-hidden="true" className="shrink-0" size={14} />
              <span className="max-w-[160px] truncate">{tab.label}</span>
            </button>
            <button
              aria-label={`Disconnect ${tab.label}`}
              className={clsx(
                "rounded-md p-1",
                isActive
                  ? "text-[#6F675C] hover:bg-[#E4D8C6] hover:text-[#7A2E22]"
                  : "text-[var(--legacy-concrete)] hover:bg-[#2C302C]"
              )}
              onClick={() => onClose(tab.id)}
              title="Disconnect"
              type="button"
            >
              <X aria-hidden="true" size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
