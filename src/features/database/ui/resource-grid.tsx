import type { ResourceDescriptor } from "@/shared/api/client";

import { clsx } from "clsx";
import { Database } from "lucide-react";

import { formatTtl } from "./value-format";
import { EmptyState, SkeletonRows } from "./workbench-states";

interface ResourceGridProps {
  readonly emptyResourceMessage: string;
  readonly isLoadingResources: boolean;
  readonly onResourceSelected: (resourceId: string) => void;
  readonly resources: ResourceDescriptor[];
  readonly selectedResourceId: string | null;
}

export function ResourceGrid({
  emptyResourceMessage,
  isLoadingResources,
  onResourceSelected,
  resources,
  selectedResourceId
}: ResourceGridProps) {
  const isInitialLoad = isLoadingResources && resources.length === 0;
  const isRefreshing = isLoadingResources && resources.length > 0;
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
                  {formatTtl(resource.ttlSeconds)}
                </td>
                <td className="border-b border-[#E0D7C8] px-4 py-3">
                  {resource.provider}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {isEmpty ? <EmptyState icon={Database} title={emptyResourceMessage} /> : null}
    </>
  );
}
