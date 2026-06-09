import type { ResourceDescriptor } from "@/shared/api/client";

import { clsx } from "clsx";
import { ChevronsDown, Database } from "lucide-react";

import { TtlBadge } from "./ttl-badge";
import { useNow } from "./use-now";
import { EmptyState, SkeletonRows } from "./workbench-states";

interface ResourceGridProps {
  readonly emptyResourceMessage: string;
  readonly hasMore: boolean;
  readonly isLoadingMore: boolean;
  readonly isLoadingResources: boolean;
  readonly isRefreshing: boolean;
  readonly onLoadMore: () => void;
  readonly onResourceSelected: (resourceId: string) => void;
  readonly resources: ResourceDescriptor[];
  readonly selectedResourceId: string | null;
  readonly ttlObservedAtMs: number;
}

export function ResourceGrid({
  emptyResourceMessage,
  hasMore,
  isLoadingMore,
  isLoadingResources,
  isRefreshing,
  onLoadMore,
  onResourceSelected,
  resources,
  selectedResourceId,
  ttlObservedAtMs
}: ResourceGridProps) {
  // One clock for the whole table; rows must not own their own intervals.
  const nowMs = useNow(1000);
  const isInitialLoad = isLoadingResources && resources.length === 0;
  const isEmpty = !isLoadingResources && resources.length === 0;

  return (
    <>
      <table
        className={clsx(
          "w-full border-separate border-spacing-0 text-sm transition-opacity",
          isRefreshing && "opacity-60"
        )}
      >
        <thead className="sticky top-0 z-10 bg-[#E7DFD2] text-left text-xs uppercase text-[#6F675C]">
          <tr>
            <th className="border-b border-[#C3BAAA] px-4 py-3 font-medium">
              Name
            </th>
            <th className="border-b border-[#C3BAAA] px-4 py-3 font-medium">
              Type
            </th>
            <th className="border-b border-[#C3BAAA] px-4 py-3 font-medium">
              TTL
            </th>
            <th className="border-b border-[#C3BAAA] px-4 py-3 font-medium">
              Provider
            </th>
          </tr>
        </thead>
        <tbody>
          {isInitialLoad ? (
            <SkeletonRows columns={4} />
          ) : (
            resources.map((resource) => (
              <tr
                className={clsx(
                  "cursor-pointer bg-[#FBF7EF] hover:bg-[#F2DCCB]",
                  selectedResourceId === resource.id && "bg-[#F2DCCB]"
                )}
                key={resource.id}
              >
                <td className="border-b border-[#E0D7C8] p-0">
                  <button
                    aria-label={`Inspect ${resource.name}`}
                    className="block w-full truncate px-4 py-3 text-left font-medium"
                    onClick={() => onResourceSelected(resource.id)}
                    title={resource.name}
                    type="button"
                  >
                    {resource.name}
                  </button>
                </td>
                <td className="border-b border-[#E0D7C8] px-4 py-3">
                  {resource.type}
                </td>
                <td className="border-b border-[#E0D7C8] px-4 py-3">
                  <TtlBadge
                    nowMs={nowMs}
                    observedAtMs={ttlObservedAtMs}
                    ttlSeconds={resource.ttlSeconds}
                  />
                </td>
                <td className="border-b border-[#E0D7C8] px-4 py-3">
                  {resource.provider}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {hasMore ? (
        <div className="flex justify-center py-3">
          <button
            className="inline-flex items-center gap-1 rounded-md border border-[#C3BAAA] bg-[#FBF7EF] px-3 py-1.5 text-xs text-[var(--legacy-ink)] transition hover:bg-[#EFE6D8] disabled:opacity-60"
            disabled={isLoadingMore}
            onClick={onLoadMore}
            title="Scan more records from the server"
            type="button"
          >
            <ChevronsDown aria-hidden="true" size={13} />
            {isLoadingMore ? "Loading more" : "Load more records"}
          </button>
        </div>
      ) : null}

      {isEmpty ? <EmptyState icon={Database} title={emptyResourceMessage} /> : null}
    </>
  );
}
