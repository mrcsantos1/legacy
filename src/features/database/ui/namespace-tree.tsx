import type { NamespaceNode } from "@/shared/api/client";

import { clsx } from "clsx";
import {
    Archive,
    ChevronRight,
    ChevronsDown,
    FileText,
    Folder,
    FolderOpen,
    KeyRound
} from "lucide-react";

interface NamespaceTreeProps {
  readonly canLoadMore: boolean;
  readonly isLoadingMore: boolean;
  readonly isLoadingNamespaces: boolean;
  readonly nodes: NamespaceNode[];
  readonly onHybridRecordClick: (node: NamespaceNode) => void;
  readonly onLoadMore: () => void;
  readonly onNodeClick: (node: NamespaceNode) => void;
  readonly onSelectRoot: () => void;
  readonly selectedFolderKey: string;
  readonly selectedNamespacePath: string[];
  readonly selectedResourceId: string | null;
}

export function NamespaceTree({
  canLoadMore,
  isLoadingMore,
  isLoadingNamespaces,
  nodes,
  onHybridRecordClick,
  onLoadMore,
  onNodeClick,
  onSelectRoot,
  selectedFolderKey,
  selectedNamespacePath,
  selectedResourceId
}: NamespaceTreeProps) {
  return (
    <section className="min-h-0 flex-1 overflow-y-auto p-3">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Archive aria-hidden="true" size={16} />
          Folders
        </div>
        {isLoadingNamespaces ? (
          <span className="text-xs text-[#6F675C]">Loading</span>
        ) : null}
      </div>

      <button
        className={clsx(
          "mt-2 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm",
          selectedNamespacePath.length === 0
            ? "bg-[var(--legacy-charcoal)] text-[var(--legacy-concrete)]"
            : "hover:bg-[#ECE3D6]"
        )}
        onClick={onSelectRoot}
        type="button"
      >
        <KeyRound aria-hidden="true" size={15} />
        Archive Root
      </button>

      <div className="mt-1 space-y-1">
        {nodes.map((node) => {
          const isSelected = isNamespaceNodeSelected({
            node,
            selectedFolderKey,
            selectedResourceId
          });

          return (
            <div
              className="flex items-center gap-1"
              key={node.id}
              style={{ paddingLeft: `${8 + node.depth * 14}px` }}
            >
              <button
                aria-label={namespaceNodeActionLabel(node)}
                className={clsx(
                  "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-2 text-left text-sm",
                  isSelected
                    ? "bg-[var(--legacy-charcoal)] text-[var(--legacy-concrete)]"
                    : "hover:bg-[#ECE3D6]"
                )}
                onClick={() => onNodeClick(node)}
                type="button"
              >
                <ChevronRight
                  aria-hidden="true"
                  className={clsx(
                    "shrink-0 opacity-60",
                    node.kind === "record" && "invisible"
                  )}
                  size={13}
                />
                <NamespaceNodeIcon isSelected={isSelected} node={node} />
                <span className="truncate">{node.label}</span>
              </button>

              {node.kind === "hybrid" ? (
                <button
                  aria-label={`Open record ${node.path.join(":")}`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#6F675C] hover:bg-[#ECE3D6]"
                  onClick={() => onHybridRecordClick(node)}
                  title="Open record"
                  type="button"
                >
                  <FileText aria-hidden="true" size={14} />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {canLoadMore ? (
        <button
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-[#C3BAAA] px-2 py-1.5 text-xs text-[#6F675C] transition hover:bg-[#ECE3D6] disabled:opacity-60"
          disabled={isLoadingMore}
          onClick={onLoadMore}
          title="Scan more folders from the server"
          type="button"
        >
          <ChevronsDown aria-hidden="true" size={13} />
          {isLoadingMore ? "Loading more" : "Load more folders"}
        </button>
      ) : null}
    </section>
  );
}

function NamespaceNodeIcon({
  isSelected,
  node
}: {
  readonly isSelected: boolean;
  readonly node: NamespaceNode;
}) {
  const className = "shrink-0";

  if (node.kind === "record") {
    return <FileText aria-hidden="true" className={className} size={14} />;
  }

  if (node.kind === "hybrid") {
    return <FolderOpen aria-hidden="true" className={className} size={14} />;
  }

  return isSelected ? (
    <FolderOpen aria-hidden="true" className={className} size={14} />
  ) : (
    <Folder aria-hidden="true" className={className} size={14} />
  );
}

function namespaceNodeActionLabel(node: NamespaceNode): string {
  const path = node.path.join(":");

  if (node.kind === "record") {
    return `Open record ${path}`;
  }

  return `Open folder ${path}`;
}

function isNamespaceNodeSelected(input: {
  readonly node: NamespaceNode;
  readonly selectedFolderKey: string;
  readonly selectedResourceId: string | null;
}): boolean {
  if (input.node.kind === "record") {
    return input.selectedResourceId === input.node.resourceId;
  }

  return input.selectedFolderKey === input.node.path.join(":");
}
